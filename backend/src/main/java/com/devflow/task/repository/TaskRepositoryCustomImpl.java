package com.devflow.task.repository;

import com.devflow.task.entity.Task;
import com.devflow.task.type.TaskStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;

import java.util.EnumMap;
import java.util.Map;

@RequiredArgsConstructor
public class TaskRepositoryCustomImpl implements TaskRepositoryCustom {

    private final EntityManager entityManager;

    @Override
    public Map<TaskStatus, Long> countByStatus(Specification<Task> specification) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> query = cb.createTupleQuery();
        Root<Task> root = query.from(Task.class);
        Path<TaskStatus> status = root.get("status");

        query.multiselect(status, cb.count(root))
                .where(specification.toPredicate(root, query, cb))
                .groupBy(status);

        Map<TaskStatus, Long> counts = new EnumMap<>(TaskStatus.class);
        for (TaskStatus value : TaskStatus.values()) {
            counts.put(value, 0L);
        }
        for (Tuple row : entityManager.createQuery(query).getResultList()) {
            counts.put(row.get(0, TaskStatus.class), row.get(1, Long.class));
        }
        return counts;
    }
}
