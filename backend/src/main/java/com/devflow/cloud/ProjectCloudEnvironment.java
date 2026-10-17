package com.devflow.cloud;

import com.devflow.global.entity.BaseTimeEntity;
import com.devflow.project.entity.Project;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 프로젝트에 연결한 클라우드 환경 (Backend-API-구현-목록 14장, ERD V7) */
@Getter
@Entity
@Table(name = "project_cloud_environments")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProjectCloudEnvironment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false, length = 30)
    private String name;

    @Column(nullable = false, length = 50)
    private String label;

    @Column(name = "is_default", nullable = false)
    private boolean defaultEnvironment;

    @Column(name = "prometheus_url", length = 300)
    private String prometheusUrl;

    @Column(name = "prometheus_token_enc", length = 1000)
    private String prometheusTokenEnc;

    @Column(name = "k8s_namespace", nullable = false, length = 63)
    private String namespace;

    @Column(name = "app_deployment", length = 63)
    private String appDeployment;

    @Column(name = "metrics_job", length = 100)
    private String metricsJob;

    @Column(name = "node_label", nullable = false, length = 30)
    private String nodeLabel;

    @Column(name = "aws_region", length = 30)
    private String awsRegion;

    @Column(name = "aws_role_arn", length = 200)
    private String awsRoleArn;

    @Column(name = "aws_external_id", nullable = false, length = 64)
    private String awsExternalId;

    @Column(name = "aws_rds_instance_id", length = 100)
    private String awsRdsInstanceId;

    @Column(name = "aws_load_balancer_arn", length = 300)
    private String awsLoadBalancerArn;

    @Column(name = "aws_target_group_arn", length = 300)
    private String awsTargetGroupArn;

    public ProjectCloudEnvironment(Project project, String name, String awsExternalId) {
        this.project = project;
        this.name = name;
        this.awsExternalId = awsExternalId;
        this.label = name;
        this.namespace = "default";
        this.nodeLabel = "node";
    }

    public void rename(String name, String label) {
        this.name = name;
        this.label = label == null || label.isBlank() ? name : label.trim();
    }

    public void markDefault(boolean value) {
        this.defaultEnvironment = value;
    }

    public void connectPrometheus(String url, String tokenEnc, boolean keepToken) {
        this.prometheusUrl = url;
        if (url == null) {
            this.prometheusTokenEnc = null;
        } else if (!keepToken) {
            this.prometheusTokenEnc = tokenEnc;
        }
    }

    public void configureKubernetes(String namespace, String appDeployment, String metricsJob, String nodeLabel) {
        this.namespace = blankTo(namespace, "default");
        this.appDeployment = blankTo(appDeployment, null);
        this.metricsJob = blankTo(metricsJob, null);
        this.nodeLabel = blankTo(nodeLabel, "node");
    }

    public void configureAws(String region, String roleArn, String rdsInstanceId, String loadBalancerArn, String targetGroupArn) {
        this.awsRegion = blankTo(region, null);
        this.awsRoleArn = blankTo(roleArn, null);
        this.awsRdsInstanceId = blankTo(rdsInstanceId, null);
        this.awsLoadBalancerArn = blankTo(loadBalancerArn, null);
        this.awsTargetGroupArn = blankTo(targetGroupArn, null);
    }

    public boolean hasAws() {
        return awsRegion != null && awsRoleArn != null;
    }

    private static String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
