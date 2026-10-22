import { useEffect, useRef, useState } from 'react'
import Button from '../Button'
import { foodCategories, foodItems } from '../../data/foodCatalog'
import { money } from '../../data/bookingCatalog'
import { addOnSubtotal } from '../../lib/bookingRules'

export default function FoodModal({ addOns, onCancel, onComplete }) {
  const dialog = useRef(null)
  const [editing, setEditing] = useState(false)
  const [items, setItems] = useState(addOns)
  useEffect(() => {
    const previous = document.activeElement
    const element = dialog.current
    element.showModal()
    return () => { element.close(); previous?.focus() }
  }, [])
  function quantity(product, delta) {
    setItems((previous) => {
      const quantity = Math.min(99, Math.max(0, (previous.find((item) => item.id === product.id)?.quantity ?? 0) + delta))
      const rest = previous.filter((item) => item.id !== product.id)
      return quantity ? [...rest, { id: product.id, name: product.name, unitPrice: product.price, quantity }] : rest
    })
  }
  return <dialog ref={dialog} className="food-dialog customer-panel" aria-labelledby="food-title" onCancel={(event) => { event.preventDefault(); onCancel(items) }}>
    <div className="section-title-row"><h2 id="food-title">Would you like to add food or drinks to your gaming session?</h2><Button variant="secondary" aria-label="Close food selection" onClick={() => onCancel(items)}>Close</Button></div>
    <p className="field-hint">Optional demo menu - INR estimates. Your session draft is kept when you close or go back.</p>
    {!editing ? <div className="flex flex-wrap gap-3"><Button onClick={() => setEditing(true)}>Add Items</Button><Button variant="secondary" onClick={() => onComplete([])}>Skip for Now</Button><Button variant="secondary" onClick={() => onCancel(items)}>Cancel</Button></div> : <>
      {foodCategories.map((category) => <section className="food-category" key={category}><h3>{category}</h3>{foodItems.filter((item) => item.category === category).map((product) => {
        const count = items.find((item) => item.id === product.id)?.quantity ?? 0
        return <div className="food-row" key={product.id}><span>{product.name}<small>{money(product.price)} each</small></span><div className="quantity-controls"><Button variant="secondary" disabled={!count} aria-label={`Decrease ${product.name}`} onClick={() => quantity(product, -1)}>&#8722;</Button><output aria-label={`${product.name} quantity`}>{count}</output><Button variant="secondary" disabled={count === 99} aria-label={`Increase ${product.name}`} onClick={() => quantity(product, 1)}>+</Button></div></div>
      })}</section>)}
      <section aria-label="Selected food items"><h3>Selected items</h3>{items.length ? items.map((item) => <div className="food-row" key={item.id}><span>{item.quantity} &times; {item.name} - {money(item.quantity * item.unitPrice)}</span><Button variant="secondary" aria-label={`Remove ${item.name}`} onClick={() => setItems(items.filter((row) => row.id !== item.id))}>Remove</Button></div>) : <p className="field-hint">No items selected.</p>}<p role="status">Food subtotal: {money(addOnSubtotal(items))}</p></section>
      <div className="flex flex-wrap gap-3"><Button onClick={() => onComplete(items)}>Add to Booking</Button><Button variant="secondary" onClick={() => onComplete([])}>Skip for Now</Button><Button variant="secondary" onClick={() => { setEditing(false) }}>Back</Button><Button variant="secondary" onClick={() => onCancel(items)}>Cancel</Button></div>
    </>}
  </dialog>
}
