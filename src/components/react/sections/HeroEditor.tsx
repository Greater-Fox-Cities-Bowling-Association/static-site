
import type { HeroSection } from '../../../types/cms';
import type { SectionEditorProps } from '../../../types/cms';
import SectionWrapper from './SectionWrapper';

type HeroEditorProps = SectionEditorProps & {
  section: HeroSection;
};

export default function HeroEditor({
  section,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: HeroEditorProps) {
  const updateField = <K extends keyof HeroSection>(field: K, value: HeroSection[K]) => {
    onChange({ ...section, [field]: value });
  };

  return (
    <SectionWrapper
      type="hero"
      onDelete={onDelete}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={section.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter hero title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subtitle
          </label>
          <textarea
            value={section.subtitle || ''}
            onChange={(e) => updateField('subtitle', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Enter subtitle (optional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Background Image URL
          </label>
          <input
            type="text"
            value={section.backgroundImage || ''}
            onChange={(e) => updateField('backgroundImage', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CTA Button Text
            </label>
            <input
              type="text"
              value={section.ctaText || ''}
              onChange={(e) => updateField('ctaText', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Get Started"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CTA Button Link
            </label>
            <input
              type="text"
              value={section.ctaLink || ''}
              onChange={(e) => updateField('ctaLink', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="/contact"
            />
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
