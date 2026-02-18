import type { TextSection } from "../../../types/cms";
import type { SectionEditorProps } from "../../../types/cms";
import SectionWrapper from "./SectionWrapper";

type TextEditorProps = SectionEditorProps & {
  section: TextSection;
};

export default function TextEditor({
  section,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: TextEditorProps) {
  const updateField = <K extends keyof TextSection>(
    field: K,
    value: TextSection[K],
  ) => {
    onChange({ ...section, [field]: value });
  };

  return (
    <SectionWrapper
      type="text"
      onDelete={onDelete}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Heading
          </label>
          <input
            type="text"
            value={section.heading || ""}
            onChange={(e) => updateField("heading", e.target.value)}
            className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Section heading (optional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Content <span className="text-red-600">*</span>
          </label>
          <textarea
            value={section.content}
            onChange={(e) => updateField("content", e.target.value)}
            className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
            rows={10}
            placeholder="Enter text content (supports markdown)"
          />
          <p className="mt-1 text-xs text-gray-500">
            Tip: You can use Markdown formatting here
          </p>
        </div>
      </div>
    </SectionWrapper>
  );
}
