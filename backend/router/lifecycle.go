package router

import (
	"context"
	"encoding/json"
	"khairul169/garage-webui/utils"
	"net/http"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

type Lifecycle struct{}

// Simplified rule for JSON API
type LifecycleRule struct {
	ID                     string `json:"id"`
	Status                 string `json:"status"` // Enabled or Disabled
	Prefix                 string `json:"prefix"`
	ExpirationDays         int32  `json:"expirationDays,omitempty"`
	AbortMultipartDays     int32  `json:"abortMultipartDays,omitempty"`
}

type LifecycleConfig struct {
	Rules []LifecycleRule `json:"rules"`
}

func (l *Lifecycle) GetLifecycleConfig(w http.ResponseWriter, r *http.Request) {
	bucket := r.PathValue("bucket")

	client, err := getS3Client(bucket)
	if err != nil {
		utils.ResponseError(w, err)
		return
	}

	result, err := client.GetBucketLifecycleConfiguration(context.Background(), &s3.GetBucketLifecycleConfigurationInput{
		Bucket: aws.String(bucket),
	})
	if err != nil {
		// No lifecycle config is not an error — return empty rules
		utils.ResponseSuccess(w, LifecycleConfig{Rules: []LifecycleRule{}})
		return
	}

	config := LifecycleConfig{Rules: []LifecycleRule{}}
	for _, rule := range result.Rules {
		lr := LifecycleRule{
			Status: string(rule.Status),
		}
		if rule.ID != nil {
			lr.ID = *rule.ID
		}
		if rule.Filter != nil {
			if pf, ok := rule.Filter.(*s3types.LifecycleRuleFilterMemberPrefix); ok {
				lr.Prefix = pf.Value
			}
		}
		if rule.Expiration != nil && rule.Expiration.Days != nil {
			lr.ExpirationDays = *rule.Expiration.Days
		}
		if rule.AbortIncompleteMultipartUpload != nil && rule.AbortIncompleteMultipartUpload.DaysAfterInitiation != nil {
			lr.AbortMultipartDays = *rule.AbortIncompleteMultipartUpload.DaysAfterInitiation
		}
		config.Rules = append(config.Rules, lr)
	}

	utils.ResponseSuccess(w, config)
}

func (l *Lifecycle) SetLifecycleConfig(w http.ResponseWriter, r *http.Request) {
	bucket := r.PathValue("bucket")

	var config LifecycleConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		utils.ResponseError(w, err)
		return
	}

	client, err := getS3Client(bucket)
	if err != nil {
		utils.ResponseError(w, err)
		return
	}

	// If no rules, delete the config
	if len(config.Rules) == 0 {
		client.DeleteBucketLifecycle(context.Background(), &s3.DeleteBucketLifecycleInput{
			Bucket: aws.String(bucket),
		})
		utils.ResponseSuccess(w, map[string]bool{"ok": true})
		return
	}

	var rules []s3types.LifecycleRule
	for _, lr := range config.Rules {
		rule := s3types.LifecycleRule{
			ID:     aws.String(lr.ID),
			Status: s3types.ExpirationStatus(lr.Status),
		}

		if lr.Prefix != "" {
			rule.Filter = &s3types.LifecycleRuleFilterMemberPrefix{Value: lr.Prefix}
		} else {
			rule.Filter = &s3types.LifecycleRuleFilterMemberPrefix{Value: ""}
		}

		if lr.ExpirationDays > 0 {
			rule.Expiration = &s3types.LifecycleExpiration{
				Days: aws.Int32(lr.ExpirationDays),
			}
		}

		if lr.AbortMultipartDays > 0 {
			rule.AbortIncompleteMultipartUpload = &s3types.AbortIncompleteMultipartUpload{
				DaysAfterInitiation: aws.Int32(lr.AbortMultipartDays),
			}
		}

		rules = append(rules, rule)
	}

	_, err = client.PutBucketLifecycleConfiguration(context.Background(), &s3.PutBucketLifecycleConfigurationInput{
		Bucket: aws.String(bucket),
		LifecycleConfiguration: &s3types.BucketLifecycleConfiguration{
			Rules: rules,
		},
	})

	if err != nil {
		utils.ResponseError(w, err)
		return
	}

	utils.ResponseSuccess(w, map[string]bool{"ok": true})
}

func (l *Lifecycle) DeleteLifecycleConfig(w http.ResponseWriter, r *http.Request) {
	bucket := r.PathValue("bucket")

	client, err := getS3Client(bucket)
	if err != nil {
		utils.ResponseError(w, err)
		return
	}

	_, err = client.DeleteBucketLifecycle(context.Background(), &s3.DeleteBucketLifecycleInput{
		Bucket: aws.String(bucket),
	})
	if err != nil {
		utils.ResponseError(w, err)
		return
	}

	utils.ResponseSuccess(w, map[string]bool{"ok": true})
}
