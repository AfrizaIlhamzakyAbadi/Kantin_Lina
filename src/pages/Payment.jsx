import { useParams } from 'react-router-dom'

export default function Payment() {
  const { orderId } = useParams()
  // TODO: show QRIS from /api/checkout response and listen to orders/{orderId} in Firestore
  return <h1>Payment: {orderId}</h1>
}
