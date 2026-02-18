import type { CtaSection } from "../../../types/cms";
import type { SectionEditorProps } from "../../../types/cms";
import SectionWrapper from "./SectionWrapper";

type CtaEditorProps = SectionEditorProps & {
  section: CtaSection;
};

export default function CtaEditor({
  section,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: CtaEditorProps) {
  const updateField = <K extends keyof CtaSection>(
    field: K,
    value: CtaSection[K],
  ) => {
    onChange({ ...section, [field]: value });
  };

  return (
    <SectionWrapper
      type="cta"
      onDelete={onDelete}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Heading <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={section.heading}
            onChange={(e) => updateField("heading", e.target.value)}
            className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter CTA heading"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Button Text <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={section.buttonText}
              onChange={(e) => updateField("buttonText", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Get Started"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Button Link <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={section.buttonLink}
              onChange={(e) => updateField("buttonLink", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="/contact"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Button Style
          </label>
          <select
            value={section.style}
            onChange={(e) =>
              updateField("style", e.target.value as "primary" | "secondary")
            }
            className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="primary">Primary (Blue)</option>
            <option value="secondary">Secondary (Gray)</option>
          </select>
        </div>
      </div>
    </SectionWrapper>
  );
}
