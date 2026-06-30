import { Card } from '#/components/ui/Card'

type EquipePlaceholderViewProps = {
  title: string
  description: string
}

export function EquipePlaceholderView({
  title,
  description,
}: EquipePlaceholderViewProps) {
  return (
    <Card title={title}>
      <p className="settings-form__hint settings-coming-soon">{description}</p>
    </Card>
  )
}
