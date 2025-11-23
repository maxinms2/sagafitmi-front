import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App', () => {
  it('renders app headline', () => {
    render(<App />)
    const el = screen.getByText(/Vite/i)
    expect(el).toBeInTheDocument()
  })
})
