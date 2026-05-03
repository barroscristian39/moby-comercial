'use client'

import { useState } from 'react'
import { NotificationFilter, NotificationType } from '@moby/shared'
import { Bell, CheckCheck, ExternalLink, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, useNotificationsSummary } from '@/hooks/use-notifications'
import { NotificationItem } from '@/lib/api/notifications.api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const FILTER_LABELS: Record<NotificationFilter, string> = {
  [NotificationFilter.ALL]: 'Todas',
  [NotificationFilter.UNREAD]: 'Não lidas',
  [NotificationFilter.READ]: 'Lidas',
}

const TYPE_LABELS: Record<NotificationType, string> = {
  [NotificationType.INFO]: 'Informação',
  [NotificationType.SUCCESS]: 'Sucesso',
  [NotificationType.WARNING]: 'Atenção',
  [NotificationType.ERROR]: 'Erro',
}

const TYPE_STYLES: Record<NotificationType, string> = {
  [NotificationType.INFO]: 'border-sky-200 bg-sky-50 text-sky-700',
  [NotificationType.SUCCESS]: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  [NotificationType.WARNING]: 'border-amber-200 bg-amber-50 text-amber-700',
  [NotificationType.ERROR]: 'border-rose-200 bg-rose-50 text-rose-700',
}

export function NotificationsModal() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<NotificationFilter>(NotificationFilter.ALL)

  const summaryQuery = useNotificationsSummary(Boolean(user))
  const notificationsQuery = useNotifications(
    { page: 1, perPage: 20, filter },
    open && Boolean(user),
  )
  const markNotificationRead = useMarkNotificationRead()
  const markAllNotificationsRead = useMarkAllNotificationsRead()

  if (!user) return null

  const summary = summaryQuery.data ?? {
    total: 0,
    unreadCount: 0,
    readCount: 0,
  }
  const notifications = notificationsQuery.data?.data ?? []

  async function handleMarkAsRead(id: string) {
    await markNotificationRead.mutateAsync(id)
  }

  async function handleOpenNotification(notification: NotificationItem) {
    if (!notification.isRead) {
      await markNotificationRead.mutateAsync(notification.id)
    }

    if (notification.link) {
      setOpen(false)
      router.push(notification.link)
    }
  }

  async function handleMarkAllAsRead() {
    if (summary.unreadCount === 0) return
    await markAllNotificationsRead.mutateAsync()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Abrir notificações">
          <Bell className="h-4 w-4" />
          {summary.unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center px-1 text-[10px]">
              {formatUnreadCount(summary.unreadCount)}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl gap-0 p-0">
        <div className="px-6 pb-4 pr-12 pt-6">
          <DialogHeader className="mb-4">
            <DialogTitle>Notificações</DialogTitle>
            <DialogDescription>
              Acompanhe alertas, ações pendentes e avisos importantes do MOBY.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={filter}
              onValueChange={(value) => setFilter(value as NotificationFilter)}
              className="w-full"
            >
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value={NotificationFilter.ALL}>
                  {FILTER_LABELS[NotificationFilter.ALL]} ({summary.total})
                </TabsTrigger>
                <TabsTrigger value={NotificationFilter.UNREAD}>
                  {FILTER_LABELS[NotificationFilter.UNREAD]} ({summary.unreadCount})
                </TabsTrigger>
                <TabsTrigger value={NotificationFilter.READ}>
                  {FILTER_LABELS[NotificationFilter.READ]} ({summary.readCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={summary.unreadCount === 0 || markAllNotificationsRead.isPending}
              className="shrink-0"
            >
              {markAllNotificationsRead.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Marcar todas como lidas
            </Button>
          </div>
        </div>

        <Separator />

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {notificationsQuery.isLoading && (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando notificações...
            </div>
          )}

          {notificationsQuery.isError && (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 text-center">
              <p className="text-sm font-medium text-foreground">Não foi possível carregar as notificações.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tente novamente em alguns instantes.
              </p>
            </div>
          )}

          {!notificationsQuery.isLoading && !notificationsQuery.isError && notifications.length === 0 && (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 text-center">
              <Bell className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Nenhuma notificação nesta visualização.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Quando houver algo importante, vamos mostrar aqui.
              </p>
            </div>
          )}

          {!notificationsQuery.isLoading && !notificationsQuery.isError && notifications.length > 0 && (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'rounded-xl border p-4 transition-colors',
                    notification.isRead ? 'border-border bg-card' : 'border-primary/20 bg-primary/5',
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                            TYPE_STYLES[notification.type],
                          )}
                        >
                          {TYPE_LABELS[notification.type]}
                        </span>
                        {!notification.isRead && (
                          <Badge variant="secondary" className="text-[11px]">
                            Nova
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-foreground">
                        {notification.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {formatNotificationDate(notification.createdAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {notification.link && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenNotification(notification)}
                          disabled={markNotificationRead.isPending}
                        >
                          <ExternalLink className="h-4 w-4" />
                          Abrir
                        </Button>
                      )}

                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={markNotificationRead.isPending}
                        >
                          Marcar como lida
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function formatUnreadCount(count: number) {
  return count > 99 ? '99+' : String(count)
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}
