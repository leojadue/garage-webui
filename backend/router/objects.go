package router

import (
	"context"
	"encoding/json"
	"fmt"
	"khairul169/garage-webui/utils"
	"net/http"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type Objects struct{}

type CopyObjectRequest struct {
	SourceBucket string `json:"sourceBucket"`
	SourceKey    string `json:"sourceKey"`
	DestBucket   string `json:"destBucket"`
	DestKey      string `json:"destKey"`
	DeleteSource bool   `json:"deleteSource"`
}

func (o *Objects) CopyObject(w http.ResponseWriter, r *http.Request) {
	var req CopyObjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ResponseErrorStatus(w, fmt.Errorf("invalid request body"), http.StatusBadRequest)
		return
	}

	if req.SourceBucket == "" || req.SourceKey == "" || req.DestBucket == "" || req.DestKey == "" {
		utils.ResponseErrorStatus(w, fmt.Errorf("sourceBucket, sourceKey, destBucket, destKey are required"), http.StatusBadRequest)
		return
	}

	if req.SourceBucket == req.DestBucket && req.SourceKey == req.DestKey {
		utils.ResponseErrorStatus(w, fmt.Errorf("source and destination are the same"), http.StatusBadRequest)
		return
	}

	// For cross-bucket operations, we need source client for reading and dest client for writing
	sourceClient, err := getS3Client(req.SourceBucket)
	if err != nil {
		utils.ResponseError(w, fmt.Errorf("cannot get source client: %w", err))
		return
	}

	copySource := fmt.Sprintf("%s/%s", req.SourceBucket, req.SourceKey)

	// If same bucket, use source client; otherwise get dest client
	var destClient *s3.Client
	if req.SourceBucket == req.DestBucket {
		destClient = sourceClient
	} else {
		destClient, err = getS3Client(req.DestBucket)
		if err != nil {
			utils.ResponseError(w, fmt.Errorf("cannot get destination client: %w", err))
			return
		}
	}

	// If source is a directory (ends with /), handle recursive copy
	if strings.HasSuffix(req.SourceKey, "/") {
		err = o.copyDirectory(sourceClient, destClient, req, copySource)
	} else {
		_, err = destClient.CopyObject(context.Background(), &s3.CopyObjectInput{
			Bucket:     aws.String(req.DestBucket),
			Key:        aws.String(req.DestKey),
			CopySource: aws.String(copySource),
		})
	}

	if err != nil {
		utils.ResponseError(w, fmt.Errorf("copy failed: %w", err))
		return
	}

	// Delete source if this is a move/rename
	if req.DeleteSource {
		if strings.HasSuffix(req.SourceKey, "/") {
			o.deleteDirectory(sourceClient, req.SourceBucket, req.SourceKey)
		} else {
			sourceClient.DeleteObject(context.Background(), &s3.DeleteObjectInput{
				Bucket: aws.String(req.SourceBucket),
				Key:    aws.String(req.SourceKey),
			})
		}
	}

	action := "copied"
	if req.DeleteSource {
		if req.SourceBucket == req.DestBucket {
			action = "moved"
		} else {
			action = "moved"
		}
	}

	utils.ResponseSuccess(w, map[string]interface{}{
		"message": fmt.Sprintf("Object %s successfully", action),
		"source":  fmt.Sprintf("%s/%s", req.SourceBucket, req.SourceKey),
		"dest":    fmt.Sprintf("%s/%s", req.DestBucket, req.DestKey),
	})
}

func (o *Objects) copyDirectory(sourceClient, destClient *s3.Client, req CopyObjectRequest, copySourcePrefix string) error {
	objects, err := sourceClient.ListObjectsV2(context.Background(), &s3.ListObjectsV2Input{
		Bucket: aws.String(req.SourceBucket),
		Prefix: aws.String(req.SourceKey),
	})
	if err != nil {
		return err
	}

	for _, obj := range objects.Contents {
		relPath := strings.TrimPrefix(*obj.Key, req.SourceKey)
		destKey := req.DestKey + relPath

		_, err := destClient.CopyObject(context.Background(), &s3.CopyObjectInput{
			Bucket:     aws.String(req.DestBucket),
			Key:        aws.String(destKey),
			CopySource: aws.String(fmt.Sprintf("%s/%s", req.SourceBucket, *obj.Key)),
		})
		if err != nil {
			return fmt.Errorf("failed to copy %s: %w", *obj.Key, err)
		}
	}
	return nil
}

func (o *Objects) deleteDirectory(client *s3.Client, bucket, prefix string) {
	objects, err := client.ListObjectsV2(context.Background(), &s3.ListObjectsV2Input{
		Bucket: aws.String(bucket),
		Prefix: aws.String(prefix),
	})
	if err != nil {
		return
	}

	for _, obj := range objects.Contents {
		client.DeleteObject(context.Background(), &s3.DeleteObjectInput{
			Bucket: aws.String(bucket),
			Key:    obj.Key,
		})
	}
}
