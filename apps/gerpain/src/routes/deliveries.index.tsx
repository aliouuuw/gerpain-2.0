import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

const deliveriesSearchSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export const Route = createFileRoute('/deliveries/')({
  validateSearch: deliveriesSearchSchema,
  beforeLoad: ({ search }) => {
    const date = search.date ?? search.startDate
    throw redirect({
      to: '/livraisons',
      search: date ? { date } : {},
    })
  },
})
