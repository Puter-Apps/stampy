async function fetchHTMLContent(url) {
  try {
    const response = await puter.net.fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    return html;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

function parseHTMLContent(html, url) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const titleElement = doc.querySelector("title");
  const title = titleElement ? titleElement.textContent.trim() : "";

  const bodyElement = doc.querySelector("body");
  const text = bodyElement ? bodyElement.textContent.trim() : "";

  const urlObj = new URL(url);

  return {
    id: `${urlObj.hostname}${urlObj.pathname}#content.txt`,
    title: title,
    text: text,
  };
}

function AddSiteDialog({ isOpen, onAddSite, onCancel }) {
  const [name, setName] = React.useState("");
  const [sitemapUrl, setSitemapUrl] = React.useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.trim() && sitemapUrl.trim()) {
      await onAddSite(name.trim(), sitemapUrl.trim());
      setName("");
      setSitemapUrl("");
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
              htmlFor="name-input"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Website Name
            </label>
            <input
              id="name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Website"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label
              htmlFor="sitemap-input"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Sitemap URL
            </label>
            <input
              id="sitemap-input"
              type="url"
              value={sitemapUrl}
              onChange={(e) => setSitemapUrl(e.target.value)}
              placeholder="https://example.com/sitemap.xml"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              type="submit"
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

function Sidebar({ onUpdateDocument }) {
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [isSignedIn, setIsSignedIn] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [sites, setSites] = React.useState([]);

  const loadWebsites = async () => {
    try {
      const websites = await puter.kv.get("websites");
      if (websites) {
        setSites(websites);
      }
    } catch (error) {
      console.error("Error loading websites:", error);
    }
  };

  const saveWebsites = async (websitesList) => {
    try {
      await puter.kv.set("websites", websitesList);
    } catch (error) {
      console.error("Error saving websites:", error);
    }
  };

  React.useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const signedIn = await puter.auth.isSignedIn();
        setIsSignedIn(signedIn);

        if (signedIn) {
          const user = await puter.auth.getUser();
          setUsername(user.username);
          await loadWebsites();
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
      }
    };

    checkAuthStatus();
  }, []);

  const handleLogin = async () => {
    try {
      await puter.auth.signIn();
      setIsSignedIn(true);
      const user = await puter.auth.getUser();
      setUsername(user.username);
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const generateUUID = () => {
    return crypto.randomUUID();
  };

  const extractHostnameFromUrl = (url) => {
    try {
      return new URL(url).hostname;
    } catch (error) {
      console.error("Invalid URL:", url);
      return "";
    }
  };

  const parseSitemapUrls = (xmlContent) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

    // Get all <loc> elements within <url> elements
    const locElements = xmlDoc.querySelectorAll("urlset url loc");

    const urls = Array.from(locElements).map((loc) => loc.textContent);

    return urls;
  };

  const handleAddSite = async (name, sitemapUrl) => {
    let sitemapContent,
      urls,
      htmlContents,
      documents,
      hostname,
      searchIndexPath;

    // 1. fetch sitemap
    try {
      const response = await puter.net.fetch(sitemapUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      sitemapContent = await response.text();
    } catch (error) {
      console.error("Error fetching sitemap:", error);
      alert("Failed to fetch sitemap. Please check the URL and try again.");
      return;
    }

    // 2. get urls from sitemap
    try {
      urls = parseSitemapUrls(sitemapContent);
      if (!urls || urls.length === 0) {
        throw new Error("No URLs found in sitemap");
      }
    } catch (error) {
      console.error("Error parsing sitemap:", error);
      alert(
        "Failed to parse sitemap. Please check if it's a valid sitemap XML."
      );
      return;
    }

    // 3. extract url contents
    try {
      const htmlPromises = urls.map((url) => fetchHTMLContent(url));
      htmlContents = await Promise.all(htmlPromises);

      documents = [];
      for (let i = 0; i < urls.length; i++) {
        const html = htmlContents[i];
        if (html) {
          const document = parseHTMLContent(html, urls[i]);
          documents.push(document);
        }
      }

      if (documents.length === 0) {
        throw new Error("No content could be extracted from any URLs");
      }
    } catch (error) {
      console.error("Error extracting content from URLs:", error);
      alert(
        "Failed to extract content from website pages. Some pages may be inaccessible."
      );
      return;
    }

    // 4. persist documents
    try {
      for (const document of documents) {
        console.log("writing to fs: ", document);
        await puter.fs.write(document.id, document.text, {
          createMissingParents: true,
        });
      }

      // parallel is broken
      // await Promise.all(
      //   documents.map(async (document) => {
      //     console.log("writing to fs: ", document);
      //     return puter.fs.write(document.id, document.text, {
      //       createMissingParents: true,
      //     });
      //   })
      // );
    } catch (error) {
      console.error("Error persisting documents:", error);
      alert("Failed to save documents to storage. Please try again.");
      return;
    }

    // 5. generate and store search index
    try {
      const miniSearch = new MiniSearch({
        fields: ["title", "text"],
      });
      miniSearch.addAll(documents);
      const searchIndex = JSON.stringify(miniSearch);

      hostname = extractHostnameFromUrl(sitemapUrl);
      searchIndexPath = hostname ? `${hostname}/index.json` : "";

      await puter.fs.write(searchIndexPath, searchIndex, {
        createMissingParents: true,
      });
    } catch (error) {
      console.error("Error generating search index:", error);
      alert("Failed to generate search index. Please try again.");
      return;
    }

    // 6. save site configuration
    try {
      const newSite = {
        id: generateUUID(),
        name: name,
        hostname: hostname,
        sitemap_url: sitemapUrl,
        index_path: searchIndexPath,
      };

      const updatedSites = [...sites, newSite];
      await saveWebsites(updatedSites);
      setSites(updatedSites);
      setShowAddDialog(false);
    } catch (error) {
      console.error("Error saving site configuration:", error);
      alert("Failed to save site configuration. Please try again.");
      return;
    }
  };

  const handleDeleteSite = async (siteId) => {
    const siteDocument = sites.find((site) => site.id === siteId);
    puter.fs.delete(siteDocument.hostname);

    const updatedSites = sites.filter((site) => site.id !== siteId);
    setSites(updatedSites);
    await saveWebsites(updatedSites);
  };

  return (
    <>
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Stampy</h1>
              <p className="text-sm text-gray-600">Chat with any websites</p>
            </div>
            <div className="flex items-center">
              {isSignedIn ? (
                <span className="text-sm text-gray-700">@{username}</span>
              ) : (
                <button
                  onClick={handleLogin}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded font-medium transition-colors"
                >
                  Login
                </button>
              )}
            </div>
          </div>
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
                className="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 border border-gray-200 cursor-pointer transition-colors"
                onClick={() => onUpdateDocument(site)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{site.name}</h3>
                    {site.hostname && (
                      <p className="text-sm text-gray-600 mt-1">
                        {site.hostname}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSite(site.id);
                    }}
                    className="text-gray-400 hover:text-red-600 p-1"
                    title="Delete site"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  {site.sitemap_url && `Sitemap: ${site.sitemap_url}`} <br />
                  {site.index_path && `Index: ${site.index_path}`}
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
