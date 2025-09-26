const TestComponent = () => {
  console.log('🔥 TestComponent renderizando...');
  
  return (
    <div style={{ 
      backgroundColor: 'red', 
      color: 'white', 
      padding: '20px',
      fontSize: '24px',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1>TESTE - Se você vê isso, o React está funcionando!</h1>
    </div>
  );
};

export default TestComponent;