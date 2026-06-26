import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { HelpNote } from '#/components/ui/HelpNote'
import { stock } from '#/mock/operational'

export function StockView() {
  return (
    <main className="page-content">
      <HelpNote>
        Vérifiez les produits en rouge : la quantité est inférieure au seuil minimum.
      </HelpNote>
      <Card>
        <table className="data-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Emplacement</th>
              <th>En stock</th>
              <th>Seuil minimum</th>
              <th>État</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((item) => {
              const isLow = item.qty < item.minStock
              return (
                <tr key={item.id}>
                  <td>{item.product}</td>
                  <td>{item.location}</td>
                  <td>
                    {item.qty} {item.unit}
                  </td>
                  <td>
                    {item.minStock} {item.unit}
                  </td>
                  <td>
                    {isLow ? (
                      <Badge variant="danger">Stock bas</Badge>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </main>
  )
}
