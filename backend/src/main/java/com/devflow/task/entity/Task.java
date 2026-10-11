package com.devflow.task.entity;

import com.devflow.global.entity.BaseTimeEntity;
import com.devflow.project.entity.Project;
import com.devflow.task.type.TaskStatus;
import com.devflow.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "tasks")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Task extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    public Task(
            String title,
            String description,
            Project project,
            User assignee
    ) {
        this.title = title;
        this.description = description;
        this.project = project;
        this.assignee = assignee;
        this.status = TaskStatus.TODO;
    }

    public void changeStatus(TaskStatus status) {
        this.status = status;
    }

    public void assignTo(User assignee) {
        this.assignee = assignee;
    }

    public void update(
            String title,
            String description
    ) {
        this.title = title;
        this.description = description;
    }
}