'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface Template {
  name: string;
  content: string;
}

export default function TemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openTemplates, setOpenTemplates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    fetchTemplates();
  }, [status, router]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('template', file);

    try {
      const response = await fetch('/api/templates/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast.success('Template uploaded successfully');
        fetchTemplates();
      } else {
        toast.error('Failed to upload template');
      }
    } catch (error) {
      toast.error('Failed to upload template');
    }
  };

  const handleDelete = async (templateName: string) => {
    try {
      const response = await fetch(`/api/templates/${templateName}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Template deleted successfully');
        fetchTemplates();
      } else {
        toast.error('Failed to delete template');
      }
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const toggleTemplate = (templateName: string) => {
    setOpenTemplates(prev => {
      const next = new Set(prev);
      if (next.has(templateName)) {
        next.delete(templateName);
      } else {
        next.add(templateName);
      }
      return next;
    });
  };

  if (status === "loading" || isLoading) return <div>Loading...</div>;
  if (!session) return null;

  return (
    <main className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto px-6 py-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">⌟ Templates</h1>
            <div className="flex items-center gap-4">
              <input
                type="file"
                id="template-upload"
                className="hidden"
                accept=".txt"
                onChange={handleFileUpload}
              />
              <Button
                onClick={() => document.getElementById('template-upload')?.click()}
                variant="outline"
              >
                ↑ Upload Template
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {templates.map((template) => (
              <Collapsible
                key={template.name}
                open={openTemplates.has(template.name)}
                onOpenChange={() => toggleTemplate(template.name)}
                className="border rounded-lg"
              >
                <div className="flex items-center justify-between p-4">
                  <CollapsibleTrigger className="flex items-center gap-2 hover:text-gray-600">
                    <ChevronDown className={`h-4 w-4 transition-transform ${openTemplates.has(template.name) ? 'transform rotate-180' : ''}`} />
                    <span className="font-medium">{template.name}</span>
                  </CollapsibleTrigger>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(template.name);
                    }}
                  >
                    × Delete
                  </Button>
                </div>
                <CollapsibleContent className="px-4 pb-4">
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded-md">
                    {template.content}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            ))}

            {templates.length === 0 && (
              <div className="text-center text-gray-500 py-8 border rounded-lg">
                No templates found. Upload your first template to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
