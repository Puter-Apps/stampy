"use client";

import Sidebar from "@/components/Sidebar";
import ChatBox from "@/components/ChatBox";
import { useState } from "react";

interface Document {
  id: string;
  name: string;
  hostname: string;
  sitemap_url: string;
  index_path: string;
}

export default function Home() {
  const [currDocument, setCurrDocument] = useState<Document | null>(null);

  const updateDocument = (document: Document) => {
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
