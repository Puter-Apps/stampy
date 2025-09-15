const app = document.getElementById("app");

function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <ChatBox />
    </div>
  );
}

const root = ReactDOM.createRoot(app);
root.render(<App />);
