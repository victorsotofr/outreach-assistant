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
import { ChevronDown, Plus, Pencil, Save, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Template {
  name: string;
  content: string;
  is_default?: boolean;
}

export default function TemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openTemplates, setOpenTemplates] = useState<Set<string>>(new Set());
  const [newTemplate, setNewTemplate] = useState({ name: "", content: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (session?.user?.email) {
      fetchTemplates();
    }
  }, [status, router, session]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/templates?email=${session?.user?.email}`);
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

    if (!file.name.endsWith('.txt')) {
      toast.error('Please upload a .txt file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('email', session?.user?.email || '');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/templates/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast.success('Template uploaded successfully');
        fetchTemplates();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to upload template');
      }
    } catch (error) {
      toast.error('Failed to upload template');
    }
  };

  const handleDelete = async (templateName: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/templates/${templateName}?email=${session?.user?.email}`, {
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

  const handleCreate = async () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session?.user?.email,
          template: newTemplate
        }),
      });

      if (response.ok) {
        toast.success('Template created successfully');
        setNewTemplate({ name: "", content: "" });
        setIsCreating(false);
        fetchTemplates();
      } else {
        toast.error('Failed to create template');
      }
    } catch (error) {
      toast.error('Failed to create template');
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate({ ...template });
    setOpenTemplates(prev => {
      const next = new Set(prev);
      next.add(template.name);
      return next;
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate || !editingTemplate.name || !editingTemplate.content) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/templates/${editingTemplate.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session?.user?.email,
          template: editingTemplate
        }),
      });

      if (response.ok) {
        toast.success('Template updated successfully');
        setEditingTemplate(null);
        fetchTemplates();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update template');
      }
    } catch (error) {
      toast.error('Failed to update template');
    }
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
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
              <Button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Template
              </Button>
            </div>
          </div>

          {/* Default Template Explanation */}
          {templates.find(t => t.is_default) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">Template Guide</h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Use these placeholders in your templates to personalize your emails:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                    <div><code className="bg-blue-100 px-2 py-1 rounded">[CIVILITY]</code> - Formal/Informal addressing</div>
                    <div><code className="bg-blue-100 px-2 py-1 rounded">[LAST_NAME]</code> - Recipient's last name</div>
                    <div><code className="bg-blue-100 px-2 py-1 rounded">[COMPANY]</code> - Company name</div>
                    <div><code className="bg-blue-100 px-2 py-1 rounded">[SCHOOL]</code> - School name</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                  {templates.find(t => t.is_default)?.content}
                </pre>
              </div>
            </div>
          )}

          {isCreating && (
            <div className="border rounded-lg p-4 space-y-4">
              <h2 className="text-lg font-semibold">Create New Template</h2>
              <Input
                placeholder="Template Name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
              />
              <Textarea
                placeholder="Template Content"
                value={newTemplate.content}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                className="min-h-[200px]"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>
                  Create Template
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {templates.filter(t => !t.is_default).map((template) => (
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
                  <div className="flex items-center gap-2">
                    {editingTemplate?.name === template.name ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveEdit}
                          className="flex items-center gap-1"
                        >
                          <Save className="h-4 w-4" />
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="flex items-center gap-1"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(template)}
                          className="flex items-center gap-1"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
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
                      </>
                    )}
                  </div>
                </div>
                <CollapsibleContent className="px-4 pb-4">
                  {editingTemplate?.name === template.name ? (
                    <div className="space-y-4">
                      <Input
                        value={editingTemplate.name}
                        onChange={(e) => setEditingTemplate(prev => ({ ...prev!, name: e.target.value }))}
                        placeholder="Template Name"
                      />
                      <Textarea
                        value={editingTemplate.content}
                        onChange={(e) => setEditingTemplate(prev => ({ ...prev!, content: e.target.value }))}
                        placeholder="Template Content"
                        className="min-h-[200px]"
                      />
                    </div>
                  ) : (
                    <pre className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded-md">
                      {template.content}
                    </pre>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}

            {templates.filter(t => !t.is_default).length === 0 && (
              <div className="text-center text-gray-500 py-8 border rounded-lg">
                No custom templates found. Create your first template to get started.
              </div>
            )}
          </div>

          <section className="bg-white border border-0 rounded-xl p-6 space-y-4">
            <h2 className="text-lg "></h2>
            <div className="space-y-4">
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
