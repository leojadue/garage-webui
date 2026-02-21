package router

import (
	"archive/zip"
	"context"
	"fmt"
	"io"
	"khairul169/garage-webui/utils"
	"net/http"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type ZipDownload struct{}

func (z *ZipDownload) DownloadAsZip(w http.ResponseWriter, r *http.Request) {
	bucket := r.PathValue("bucket")
	prefix := r.URL.Query().Get("prefix")

	if prefix == "" {
		utils.ResponseError(w, fmt.Errorf("prefix is required"))
		return
	}

	client, err := getS3Client(bucket)
	if err != nil {
		utils.ResponseError(w, err)
		return
	}

	// List all objects under the prefix
	var allKeys []string
	var continuationToken *string

	for {
		input := &s3.ListObjectsV2Input{
			Bucket:            aws.String(bucket),
			Prefix:            aws.String(prefix),
			MaxKeys:           aws.Int32(1000),
			ContinuationToken: continuationToken,
		}

		result, err := client.ListObjectsV2(context.Background(), input)
		if err != nil {
			utils.ResponseError(w, err)
			return
		}

		for _, obj := range result.Contents {
			if obj.Key != nil && !strings.HasSuffix(*obj.Key, "/") {
				allKeys = append(allKeys, *obj.Key)
			}
		}

		if result.IsTruncated != nil && *result.IsTruncated && result.NextContinuationToken != nil {
			continuationToken = result.NextContinuationToken
		} else {
			break
		}
	}

	if len(allKeys) == 0 {
		utils.ResponseError(w, fmt.Errorf("no files found"))
		return
	}

	// Derive ZIP filename from the prefix
	folderName := strings.TrimSuffix(prefix, "/")
	parts := strings.Split(folderName, "/")
	zipName := parts[len(parts)-1]
	if zipName == "" {
		zipName = bucket
	}

	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.zip\"", zipName))

	zipWriter := zip.NewWriter(w)
	defer zipWriter.Close()

	for _, key := range allKeys {
		obj, err := client.GetObject(context.Background(), &s3.GetObjectInput{
			Bucket: aws.String(bucket),
			Key:    aws.String(key),
		})
		if err != nil {
			continue // skip files that fail
		}

		// Use path relative to the prefix
		relativePath := strings.TrimPrefix(key, prefix)
		if relativePath == "" {
			relativePath = key
		}

		entry, err := zipWriter.Create(relativePath)
		if err != nil {
			obj.Body.Close()
			continue
		}

		io.Copy(entry, obj.Body)
		obj.Body.Close()
	}
}
