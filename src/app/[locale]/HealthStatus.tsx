'use client'

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useHealthQuery } from '@/lib/query/health.queries'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface HealthStatusProps {
  initialData: { status: string; version: string; isMock?: boolean }
}

export function HealthStatus({ initialData }: HealthStatusProps) {
  const { t } = useTranslation()
  const { data, isLoading } = useHealthQuery()

  const health = data ?? initialData
  const isOk = health.status === 'ok'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('health.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isLoading ? (
            <>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </>
          ) : (
            <>
              <motion.div
                key={health.status}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Badge variant={isOk ? 'default' : 'destructive'}>
                  {isOk ? t('health.ok') : t('health.error')}
                </Badge>
              </motion.div>

              <p className="text-muted-foreground text-xs">
                {t('health.version', { version: health.version })}
              </p>

              {health.isMock && (
                <p className="text-warning text-xs">{t('health.mock')}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
