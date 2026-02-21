package router

import (
	"context"
	"khairul169/garage-webui/utils"
	"net/http"
	"strconv"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type Presign struct{}

func (p *Presign) GetPresignedURL(w http.ResponseWriter, r *http.Request) {
	bucket := r.PathValue("bucket")
	key := r.PathValue("key")

	expiresStr := r.URL.Query().Get("expires")
	expires, err := strconv.Atoi(expiresStr)
	if err != nil || expires <= 0 {
		expires = 3600 // default 1 hour
	}

	// Cap at 7 days (604800 seconds)
	if expires > 604800 {
		expires = 604800
	}

	client, err := getS3Client(bucket)
	if err != nil {
		utils.ResponseError(w, err)
		return
	}

	presignClient := s3.NewPresignClient(client)

	result, err := presignClient.PresignGetObject(context.Background(), &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Duration(expires) * time.Second
	})

	if err != nil {
		utils.ResponseError(w, err)
		return
	}

	utils.ResponseSuccess(w, map[string]interface{}{
		"url":       result.URL,
		"expiresIn": expires,
		"method":    result.Method,
	})
}
