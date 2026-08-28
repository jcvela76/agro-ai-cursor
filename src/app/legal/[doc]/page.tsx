import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLegalDocument, LEGAL_SLUGS } from "@/content/legal/documents";
import { LegalDocumentView } from "@/ui/legal-document-view";

type Props = {
  params: Promise<{ doc: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_SLUGS.map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { doc } = await params;
  const entry = getLegalDocument(doc);
  if (!entry) {
    return {};
  }
  const path = `/legal/${doc}`;
  return {
    title: entry.title,
    description: entry.description,
    alternates: { canonical: path },
    openGraph: {
      title: entry.title,
      description: entry.description,
      url: path,
    },
    twitter: {
      title: entry.title,
      description: entry.description,
    },
  };
}

export default async function LegalDocPage({ params }: Props) {
  const { doc } = await params;
  const entry = getLegalDocument(doc);
  if (!entry) {
    notFound();
  }

  return <LegalDocumentView document={entry} />;
}
