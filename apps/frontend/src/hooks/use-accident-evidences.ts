import type { AccidentEvidenceType } from '@moby/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { triggerToast } from '@/lib/toast-registry'
import { accidentEvidencesApi, type AccidentEvidence } from '@/lib/api/accident-evidences.api'

export function useAccidentEvidences(accidentId: string | undefined) {
  return useQuery({
    queryKey: ['accident-evidences', accidentId],
    queryFn: () => accidentEvidencesApi.list(accidentId!),
    enabled: !!accidentId,
    staleTime: 1000 * 30,
  })
}

export function useUploadAccidentEvidence(accidentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { evidenceType: AccidentEvidenceType; notes?: string; file: File }) =>
      accidentEvidencesApi.upload(accidentId, input),
    onSuccess: () => {
      triggerToast({
        title: '✓ Evidência enviada',
        description: 'O arquivo foi adicionado ao registro do acidente',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['accident-evidences', accidentId] })
    },
  })
}

export function useRemoveAccidentEvidence(accidentId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (evidenceId: string) => accidentEvidencesApi.remove(accidentId!, evidenceId),
    onSuccess: () => {
      triggerToast({
        title: '✓ Evidência removida',
        description: 'O arquivo saiu do histórico ativo do acidente',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['accident-evidences', accidentId] })
    },
  })
}

export function useDownloadAccidentEvidence(accidentId: string | undefined) {
  return useMutation({
    mutationFn: (evidence: AccidentEvidence) =>
      accidentEvidencesApi.download(accidentId!, evidence.id, evidence.fileName),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    },
  })
}
