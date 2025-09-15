function AddSiteDialog({ isOpen, onAddSite, onCancel }) {
  const [url, setUrl] = React.useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      onAddSite(url.trim());
      setUrl("");
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Add New Site
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="url-input"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Website URL
            </label>
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
          <div className="flex space-x-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Add Site
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Sidebar() {
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [sites, setSites] = React.useState([
    {
      id: 1,
      name: "Puter.js Docs",
      url: "https://docs.puter.com/",
      pages: 1234,
      lastUpdated: "2 hours ago",
    },
  ]);

  const handleAddSite = (url) => {
    const newSite = {
      id: Date.now(),
      name: new URL(url).hostname,
      url: url,
      status: "indexing",
      pages: 0,
      lastUpdated: "Just added",
    };
    setSites([...sites, newSite]);
    setShowAddDialog(false);
  };

  return (
    <>
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Stampy</h1>
          <p className="text-sm text-gray-600">Chat with any websites</p>
        </div>

        <div className="p-4">
          <button
            onClick={() => setShowAddDialog(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
          >
            + Add Site
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {sites.map((site) => (
              <div
                key={site.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{site.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{site.url}</p>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600"></button>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  {site.pages > 0
                    ? `${site.pages.toLocaleString()} pages • `
                    : ""}
                  Last updated {site.lastUpdated}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AddSiteDialog
        isOpen={showAddDialog}
        onAddSite={handleAddSite}
        onCancel={() => setShowAddDialog(false)}
      />
    </>
  );
}
