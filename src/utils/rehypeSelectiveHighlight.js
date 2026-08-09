import { createLowlight } from 'lowlight';
import cpp from 'highlight.js/lib/languages/cpp';
import javascript from 'highlight.js/lib/languages/javascript';
import plaintext from 'highlight.js/lib/languages/plaintext';

const lowlight = createLowlight({ cpp, javascript, plaintext });
lowlight.registerAlias('javascript', ['js', 'jsx', 'ts', 'tsx']);
lowlight.registerAlias('plaintext', ['text', 'txt']);

const getText = (node) => {
    if (typeof node.value === 'string') return node.value;
    return Array.isArray(node.children) ? node.children.map(getText).join('') : '';
};

const visit = (node) => {
    if (!node || typeof node !== 'object') return;

    if (node.tagName === 'code' && Array.isArray(node.properties?.className)) {
        const languageClass = node.properties.className.find(value => String(value).startsWith('language-'));
        const language = languageClass ? String(languageClass).slice(9) : null;

        if (language && lowlight.registered(language)) {
            const result = lowlight.highlight(language, getText(node));
            node.properties.className.unshift('hljs');
            node.children = result.children;
        }
    }

    if (Array.isArray(node.children)) node.children.forEach(visit);
};

export default function rehypeSelectiveHighlight() {
    return visit;
}
