// 파일 크기 표시: 820B / 4.2KB / 1.5MB
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round((bytes / 1024) * 10) / 10}KB`
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`
}
