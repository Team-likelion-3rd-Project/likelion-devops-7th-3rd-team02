package com.devflow.integration.entity;

import com.devflow.global.entity.BaseTimeEntity;
import com.devflow.project.entity.Project;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 프로젝트 ↔ 외부 저장소 연결 (GitHub: owner/repo). 토큰은 저장하지 않는다. */
@Getter
@Entity
@Table(name = "project_integrations")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProjectIntegration extends BaseTimeEntity {

    public static final String GITHUB = "GITHUB";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false, length = 20)
    private String provider;

    @Column(name = "external_path", nullable = false, length = 200)
    private String externalPath;

    public ProjectIntegration(Project project, String provider, String externalPath) {
        this.project = project;
        this.provider = provider;
        this.externalPath = externalPath;
    }

    public void changePath(String externalPath) {
        this.externalPath = externalPath;
    }
}
