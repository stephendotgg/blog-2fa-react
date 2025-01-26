import TOTPAuthenticator from './components/TOTPAuthenticator';

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
      <TOTPAuthenticator />
    </div>
  );
}

export default App;