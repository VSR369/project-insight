import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Link2, ExternalLink } from 'lucide-react';

interface SupportingLink {
  url: string;
  title: string;
  description: string;
}

interface SupportingLinksFormProps {
  links: SupportingLink[];
  onChange: (links: SupportingLink[]) => void;
  disabled?: boolean;
}

export function SupportingLinksForm({ links, onChange, disabled }: SupportingLinksFormProps) {
  const [errors, setErrors] = useState<Record<number, string>>({});

  const addLink = () => {
    onChange([...links, { url: '', title: '', description: '' }]);
  };

  const removeLink = (index: number) => {
    const newLinks = [...links];
    newLinks.splice(index, 1);
    onChange(newLinks);
    
    // Clear error for removed link
    const newErrors = { ...errors };
    delete newErrors[index];
    setErrors(newErrors);
  };

  const updateLink = (index: number, field: keyof SupportingLink, value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    onChange(newLinks);

    // Validate URL
    if (field === 'url') {
      const newErrors = { ...errors };
      if (value && !isValidUrl(value)) {
        newErrors[index] = 'Please enter a valid URL';
      } else {
        delete newErrors[index];
      }
      setErrors(newErrors);
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">Supporting Links</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Add links to relevant projects, portfolios, or publications
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addLink}
          disabled={disabled}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Link
        </Button>
      </div>

      {links.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Link2 className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No links added yet. Click "Add Link" to include supporting evidence.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {links.map((link, index) => (
            <Card key={index} className="relative">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Link {index + 1}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLink(index)}
                    disabled={disabled}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`link-url-${index}`} className="text-sm">
                      URL <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`link-url-${index}`}
                      type="url"
                      placeholder="https://example.com/your-work"
                      value={link.url}
                      onChange={(e) => updateLink(index, 'url', e.target.value)}
                      disabled={disabled}
                      className={errors[index] ? 'border-destructive' : ''}
                    />
                    {errors[index] && (
                      <p className="text-xs text-destructive">{errors[index]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`link-title-${index}`} className="text-sm">
                      Link Title
                    </Label>
                    <Input
                      id={`link-title-${index}`}
                      placeholder="e.g., Project Demo, GitHub Repository"
                      value={link.title}
                      onChange={(e) => updateLink(index, 'title', e.target.value)}
                      disabled={disabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`link-desc-${index}`} className="text-sm">
                      Description <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id={`link-desc-${index}`}
                      placeholder="Brief description of this link..."
                      value={link.description}
                      onChange={(e) => updateLink(index, 'description', e.target.value)}
                      disabled={disabled}
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
