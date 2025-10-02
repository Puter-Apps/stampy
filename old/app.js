const app = document.getElementById("app");

function App() {
  const [currDocument, setCurrDocument] = React.useState();

  const updateDocument = (document) => {
    console.log("Selected site: ", document);
    setCurrDocument(document);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar onUpdateDocument={updateDocument} />
      <ChatBox document={currDocument} />
    </div>
  );
}

const root = ReactDOM.createRoot(app);
root.render(<App />);
