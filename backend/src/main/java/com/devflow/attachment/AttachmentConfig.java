package com.devflow.attachment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.nio.file.Path;
import java.time.Clock;

/** devflow.attachment.storage = local(기본) | s3 */
@Configuration
@EnableConfigurationProperties(AttachmentProperties.class)
public class AttachmentConfig {

    @Bean
    public DownloadTokens attachmentDownloadTokens(@Value("${jwt.secret}") String jwtSecret, Clock clock) {
        return new DownloadTokens(jwtSecret, clock);
    }

    @Bean
    public AttachmentStorage attachmentStorage(AttachmentProperties properties, DownloadTokens tokens) {
        if ("s3".equals(properties.storage())) {
            AttachmentProperties.S3 s3 = properties.s3();
            if (s3.bucket() == null || s3.bucket().isBlank() || s3.region() == null || s3.region().isBlank()) {
                throw new IllegalStateException("ATTACHMENT_STORAGE=s3이면 ATTACHMENT_S3_BUCKET, ATTACHMENT_S3_REGION이 필요합니다.");
            }
            Region region = Region.of(s3.region().trim());
            return new S3AttachmentStorage(
                    S3Client.builder().region(region).credentialsProvider(DefaultCredentialsProvider.create()).build(),
                    S3Presigner.builder().region(region).credentialsProvider(DefaultCredentialsProvider.create()).build(),
                    s3.bucket().trim());
        }
        return new LocalAttachmentStorage(Path.of(properties.local().dir()), tokens);
    }
}
