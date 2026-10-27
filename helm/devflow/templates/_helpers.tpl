{{/*
Container image reference: <repository>:<tag>.
tag defaults to the "<IMAGE_TAG>" placeholder used by the original
k8s/{backend,frontend}/deployment.yaml manifests, so `helm template` output
matches the pre-GitOps manifests 1:1 until a GitOps values file
(devflow-gitops: values/aws-dev.yaml) overrides it with a real tag.
*/}}
{{- define "devflow.image" -}}
{{ .repository }}:{{ .tag | default "<IMAGE_TAG>" }}
{{- end -}}
