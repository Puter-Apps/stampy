function ChatBox({ document }) {
  const [messages, setMessages] = React.useState([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef(null);
  const miniSearchRef = React.useRef(null);

  const searchDocuments = async (query) => {
    console.log(`Searching documents for: ${query}`);

    if (!miniSearchRef.current) {
      console.warn("Search index not loaded");
      return "Search index not available. Please wait for the index to load.";
    }

    try {
      const searchResults = miniSearchRef.current.search(query);
      const topResults = searchResults.slice(0, 5);

      if (topResults.length === 0) {
        return "No relevant documents found for your query.";
      }

      const documentContents = [];

      for (const result of topResults) {
        try {
          const documentContent = await puter.fs.read(result.id);
          documentContents.push(documentContent);
        } catch (error) {
          console.error(`Failed to read document ${result.id}:`, error);
        }
      }

      return documentContents.join("\n\n");
    } catch (error) {
      console.error("Search error:", error);
      return "An error occurred while searching documents.";
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  React.useEffect(() => {
    const loadSearchIndex = async () => {
      if (!document?.index_path) return;

      try {
        const indexData = await puter.fs.read(document.index_path);
        const miniSearch = MiniSearch.loadJSON(indexData, {
          fields: ["title", "text"],
        });
        miniSearchRef.current = miniSearch;
        console.log("Search index loaded successfully");
      } catch (error) {
        console.error("Failed to load search index:", error);
        miniSearchRef.current = null;
      }
    };

    loadSearchIndex();
  }, [document]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: inputValue.trim(),
    };

    let conversationMessages = [...messages, userMessage];
    setMessages(conversationMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const tools = [
        {
          type: "function",
          function: {
            name: "search_documents",
            description:
              "Search through website documents to find relevant information",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query to find relevant documents",
                },
              },
              required: ["query"],
            },
          },
        },
      ];

      const response = await puter.ai.chat(conversationMessages, {
        model: "openrouter:google/gemini-2.5-flash-lite",
        tools: tools,
        stream: false,
      });

      if (response.message.tool_calls?.length > 0) {
        const toolCall = response.message.tool_calls[0];
        if (toolCall.function.name === "search_documents") {
          const args = JSON.parse(toolCall.function.arguments);
          const searchResult = await searchDocuments(args.query);

          conversationMessages = [
            ...conversationMessages,
            response.message,
            {
              role: "tool",
              tool_call_id: toolCall.id,
              content: searchResult,
            },
          ];

          const finalResponse = await puter.ai.chat(conversationMessages, {
            model: "openrouter:google/gemini-2.5-flash-lite",
            stream: true,
          });

          const assistantMessage = {
            id: Date.now() + 1,
            role: "assistant",
            content: "",
          };

          setMessages((prev) => [...prev, assistantMessage]);

          for await (const part of finalResponse) {
            if (part?.text) {
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                lastMessage.content += part.text;
                return newMessages;
              });
            }
          }
        }
      } else {
        const assistantMessage = {
          id: Date.now() + 1,
          role: "assistant",
          content: response.message.content,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          "Sorry, I encountered an error while processing your request. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!document) {
    return (
      <div className="flex-1 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            AI Chat Assistant
          </h2>
          <p className="text-sm text-gray-600">
            Ask questions about your indexed content
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-lg">Choose a website to chat</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          AI Chat Assistant
        </h2>
        <p className="text-sm text-gray-600">
          Ask questions about your indexed content
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 ${
              message.role === "user" ? "justify-end" : ""
            }`}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">AI</span>
                </div>
              </div>
            )}
            <div
              className={`rounded-lg p-3 max-w-2xl ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-50 text-gray-900"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            {message.role === "user" && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">U</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">AI</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question about your indexed content..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
