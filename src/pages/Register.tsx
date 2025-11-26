import CreateUser from '../components/CreateUser'

type Props = { onBack?: () => void; onCreated?: (email: string) => void }

export default function Register({ onBack, onCreated }: Props) {
  return (
    <div className="bg-light" style={{ minHeight: '100vh' }}>
      <main className="container" style={{ paddingTop: '2rem' }}>
        <div className="row justify-content-center">
          <div className="col-12 col-md-6 col-lg-4">
            <CreateUser onClose={onBack} onCreated={onCreated} />
          </div>
        </div>
      </main>
    </div>
  )
}
