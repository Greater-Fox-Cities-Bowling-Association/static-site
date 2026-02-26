import box from './metadata/box.json' assert { type: 'json' };
import stack from './metadata/stack.json' assert { type: 'json' };
import grid from './metadata/grid.json' assert { type: 'json' };
import typography from './metadata/typography.json' assert { type: 'json' };
import button from './metadata/button.json' assert { type: 'json' };
import divider from './metadata/divider.json' assert { type: 'json' };
import paper from './metadata/paper.json' assert { type: 'json' };
import image from './metadata/image.json' assert { type: 'json' };
import icon from './metadata/icon.json' assert { type: 'json' };
import spacer from './metadata/spacer.json' assert { type: 'json' };
import card from './metadata/card.json' assert { type: 'json' };
import hero from './metadata/hero.json' assert { type: 'json' };
import navbar from './metadata/navbar.json' assert { type: 'json' };
import footer from './metadata/footer.json' assert { type: 'json' };
import featureList from './metadata/featureList.json' assert { type: 'json' };
import pricingTable from './metadata/pricingTable.json' assert { type: 'json' };

const allComponents = [
  box, stack, grid, typography, button, divider, paper, image, icon, spacer,
  card, hero, navbar, footer, featureList, pricingTable,
];

/**
 * componentRegistry — Map<id, componentMetadata>
 *
 * Keys are the component `id` strings (e.g. "box", "card").
 * Values are the full metadata objects from the JSON files.
 */
export const componentRegistry = new Map(
  allComponents.map((component) => [component.id, component])
);

/**
 * Returns all component metadata objects as an array.
 */
export function getAllComponents() {
  return allComponents;
}

/**
 * Returns component metadata by id, or undefined if not found.
 * @param {string} id
 */
export function getComponent(id) {
  return componentRegistry.get(id);
}

/**
 * Returns all primitive components.
 */
export function getPrimitives() {
  return allComponents.filter((c) => c.category === 'primitive');
}

/**
 * Returns all composite components.
 */
export function getComposites() {
  return allComponents.filter((c) => c.category === 'composite');
}
