import type { CardGridSection, Card } from "../../../types/cms";
import type { SectionEditorProps } from "../../../types/cms";
import SectionWrapper from "./SectionWrapper";

type CardGridEditorProps = SectionEditorProps & {
  section: CardGridSection;
};

export default function CardGridEditor({
  section,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: CardGridEditorProps) {
  const updateField = <K extends keyof CardGridSection>(
    field: K,
    value: CardGridSection[K],
  ) => {
    onChange({ ...section, [field]: value });
  };

  const updateCard = (index: number, field: keyof Card, value: string) => {
    const newCards = [...section.cards];
    const card = newCards[index];
    if (!card) return;

    // Build the updated card with only defined values
    const updatedCard: Card = {
      title: field === "title" ? value : card.title,
      description: field === "description" ? value : card.description,
    };

    // Only include optional properties if they have values
    const imageUrl = field === "imageUrl" ? value : card.imageUrl;
    if (imageUrl) updatedCard.imageUrl = imageUrl;

    const link = field === "link" ? value : card.link;
    if (link) updatedCard.link = link;

    newCards[index] = updatedCard;
    updateField("cards", newCards);
  };

  const addCard = () => {
    updateField("cards", [...section.cards, { title: "", description: "" }]);
  };

  const removeCard = (index: number) => {
    updateField(
      "cards",
      section.cards.filter((_, i) => i !== index),
    );
  };

  return (
    <SectionWrapper
      type="cardGrid"
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
            Number of Columns
          </label>
          <select
            value={section.columns}
            onChange={(e) =>
              updateField("columns", parseInt(e.target.value) as 2 | 3 | 4)
            }
            className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="2">2 Columns</option>
            <option value="3">3 Columns</option>
            <option value="4">4 Columns</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-text-secondary">
              Cards
            </label>
            <button
              onClick={addCard}
              className="px-3 py-1 text-sm bg-primary text-background rounded hover:bg-accent"
            >
              + Add Card
            </button>
          </div>

          <div className="space-y-3">
            {section.cards.map((card, index) => (
              <div
                key={index}
                className="p-4 border border-text/10 rounded-md bg-background"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-medium text-text-secondary">
                    Card {index + 1}
                  </span>
                  <button
                    onClick={() => removeCard(index)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={card.title}
                    onChange={(e) => updateCard(index, "title", e.target.value)}
                    className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Card title"
                  />

                  <textarea
                    value={card.description}
                    onChange={(e) =>
                      updateCard(index, "description", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Card description"
                  />

                  <input
                    type="text"
                    value={card.imageUrl || ""}
                    onChange={(e) =>
                      updateCard(index, "imageUrl", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Image URL (optional)"
                  />

                  <input
                    type="text"
                    value={card.link || ""}
                    onChange={(e) => updateCard(index, "link", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Link URL (optional)"
                  />
                </div>
              </div>
            ))}

            {section.cards.length === 0 && (
              <p className="text-sm text-text-secondary text-center py-4">
                No cards yet. Click "Add Card" to create one.
              </p>
            )}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
