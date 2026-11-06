/**
 * Grep Generator for InDesign
 * Generates grep patterns for InDesign's Find/Change functionality
 */
/**
 * Escapes special regex characters for InDesign grep
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/**
 * Generates grep pattern for specific words
 */
function generateWordsPattern(words, options) {
    if (words.length === 0)
        return '';
    const escapedWords = words.map(word => escapeRegex(word.trim())).filter(w => w.length > 0);
    if (escapedWords.length === 0)
        return '';
    let pattern;
    if (options.wholeWord) {
        // Wrap each word individually with word boundaries for proper whole word matching
        pattern = escapedWords.map(word => `\\b${word}\\b`).join('|');
        pattern = `(${pattern})`;
    }
    else {
        pattern = `(${escapedWords.join('|')})`;
    }
    return pattern;
}
/**
 * Generates grep pattern for digits
 */
function generateDigitsPattern(min, max) {
    if (min === max) {
        return `\\d{${min}}`;
    }
    return `\\d{${min},${max}}`;
}
/**
 * Generates grep pattern for punctuation
 */
function generatePunctuationPattern(type) {
    const punctuationMap = {
        'all': '[\\.,;:?!\\-"\'()\\[\\]{}]',
        'period': '\\.',
        'comma': ',',
        'semicolon': ';',
        'colon': ':',
        'question': '\\?',
        'exclamation': '!',
        'quotes': '[""]',
        'apostrophe': "'",
        'hyphen': '-',
        'dash': '—',
        'parentheses': '[()]',
        'brackets': '[\\[\\]]',
        'braces': '[{}]'
    };
    return punctuationMap[type] || punctuationMap['all'];
}
/**
 * Generates grep pattern for content enclosed by markers
 */
function generateEnclosedPattern(startMarker, endMarker) {
    const escapedStart = escapeRegex(startMarker);
    const escapedEnd = escapeRegex(endMarker);
    // Match any content between markers (non-greedy)
    return `${escapedStart}[^${escapedEnd}]*?${escapedEnd}`;
}
/**
 * Updates the grep pattern output
 */
function updateGrepPattern() {
    const searchType = document.querySelector('input[name="searchType"]:checked')?.value || 'words';
    const caseSensitive = document.getElementById('caseSensitive')?.checked || false;
    const wholeWord = document.getElementById('wholeWord')?.checked || false;
    const options = { caseSensitive, wholeWord };
    let pattern = '';
    let description = '';
    switch (searchType) {
        case 'words': {
            const wordsInput = document.getElementById('wordsInput')?.value || '';
            const words = wordsInput.split('\n').filter(w => w.trim().length > 0);
            pattern = generateWordsPattern(words, options);
            description = words.length > 0
                ? `Matches ${words.length} word${words.length > 1 ? 's' : ''}`
                : 'Enter words to match';
            break;
        }
        case 'digits': {
            const min = parseInt(document.getElementById('digitsMin')?.value || '1', 10);
            const max = parseInt(document.getElementById('digitsMax')?.value || '10', 10);
            pattern = generateDigitsPattern(min, max);
            description = `Matches ${min === max ? min : `${min} to ${max}`} digit${max > 1 ? 's' : ''}`;
            break;
        }
        case 'punctuation': {
            const punctuationType = document.getElementById('punctuationSelect')?.value || 'all';
            pattern = generatePunctuationPattern(punctuationType);
            const typeNames = {
                'all': 'all punctuation',
                'period': 'periods',
                'comma': 'commas',
                'semicolon': 'semicolons',
                'colon': 'colons',
                'question': 'question marks',
                'exclamation': 'exclamation marks',
                'quotes': 'quotes',
                'apostrophe': 'apostrophes',
                'hyphen': 'hyphens',
                'dash': 'dashes',
                'parentheses': 'parentheses',
                'brackets': 'brackets',
                'braces': 'braces'
            };
            description = `Matches ${typeNames[punctuationType] || 'punctuation'}`;
            break;
        }
        case 'enclosed': {
            const startMarker = document.getElementById('startMarker')?.value || '';
            const endMarker = document.getElementById('endMarker')?.value || '';
            if (startMarker && endMarker) {
                pattern = generateEnclosedPattern(startMarker, endMarker);
                description = `Matches content between "${startMarker}" and "${endMarker}"`;
            }
            else {
                description = 'Enter start and end markers';
            }
            break;
        }
    }
    // Add case-insensitive flag if case sensitive is NOT selected
    // InDesign GREP: (?i) = case-insensitive, default is case-sensitive
    if (!caseSensitive && pattern) {
        pattern = `(?i)${pattern}`;
    }
    const output = document.getElementById('grepOutput');
    const syntaxExplanation = document.getElementById('syntaxExplanation');
    if (!output)
        return;
    if (pattern) {
        const caseNote = options.caseSensitive
            ? '<p class="helper-text"><strong>Note:</strong> Enable "Case Sensitive" checkbox in InDesign paragraph style GREP Style settings</p>'
            : '<p class="helper-text"><strong>Note:</strong> Case insensitive (uncheck "Case Sensitive" in InDesign paragraph style GREP Style settings)</p>';
        // Create copy button with proper escaping
        const copyButton = document.createElement('button');
        copyButton.className = 'btn-copy';
        copyButton.textContent = 'Copy';
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(pattern).then(() => {
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = 'Copy';
                }, 2000);
            });
        });
        const patternDiv = document.createElement('div');
        patternDiv.className = 'grep-pattern';
        patternDiv.innerHTML = `
      <label class="grep-label">Pattern:</label>
      <code class="grep-code">${escapeHtml(pattern)}</code>
    `;
        patternDiv.appendChild(copyButton);
        output.innerHTML = '';
        output.appendChild(patternDiv);
        // Add description and notes
        const descriptionP = document.createElement('p');
        descriptionP.className = 'helper-text';
        descriptionP.textContent = description;
        output.appendChild(descriptionP);
        const caseNoteP = document.createElement('p');
        caseNoteP.className = 'helper-text';
        caseNoteP.innerHTML = options.caseSensitive
            ? '<strong>Note:</strong> Pattern is case-sensitive (default InDesign behavior)'
            : '<strong>Note:</strong> Pattern includes (?i) flag for case-insensitive matching';
        output.appendChild(caseNoteP);
        if (options.wholeWord) {
            const wholeWordP = document.createElement('p');
            wholeWordP.className = 'helper-text';
            wholeWordP.innerHTML = '<strong>Note:</strong> Pattern includes word boundaries (\\b) for whole word matching';
            output.appendChild(wholeWordP);
        }
        // Show syntax explanation when pattern is generated
        if (syntaxExplanation) {
            syntaxExplanation.style.display = 'block';
        }
    }
    else {
        // Show instructions table when no pattern is generated
        let instructionsTable = '<table class="syntax-table">';
        switch (searchType) {
            case 'words':
                instructionsTable += `
          <tr>
            <td class="syntax-code"><strong>Words input</strong></td>
            <td class="syntax-description">Enter one word per line in the text area. The pattern will match all listed words. Example: type "cat" on one line, "dog" on the next line to match both words.</td>
          </tr>
          <tr>
            <td class="syntax-code"><strong>Case sensitive</strong></td>
            <td class="syntax-description">When checked: matches exact capitalization (e.g., "Hello" won't match "hello"). When unchecked: adds (?i) flag to ignore case, so "Hello", "hello", and "HELLO" all match the same way.</td>
          </tr>
          <tr>
            <td class="syntax-code"><strong>Whole word only</strong></td>
            <td class="syntax-description">When checked: matches complete words only using word boundaries (\\b). For example, "cat" won't match "category" or "scatter". When unchecked: matches the word anywhere it appears, even as part of other words.</td>
          </tr>
          <tr>
            <td class="syntax-code"><strong>Use case</strong></td>
            <td class="syntax-description">Useful for finding specific terms, names, or keywords throughout your document. Perfect for applying consistent formatting to multiple words at once.</td>
          </tr>
        `;
                break;
            case 'digits':
                instructionsTable += `
          <tr>
            <td class="syntax-code"><strong>Minimum digits</strong></td>
            <td class="syntax-description">The smallest number of consecutive digits to match. Set to 1 to match single digits (0-9), or higher to match longer numbers. Example: minimum 2 matches "12", "123", "1234" but not "1".</td>
          </tr>
          <tr>
            <td class="syntax-code"><strong>Maximum digits</strong></td>
            <td class="syntax-description">The largest number of consecutive digits to match. When equal to minimum, matches exact length. Example: min 2, max 2 matches only two-digit numbers like "12" or "99".</td>
          </tr>
          <tr>
            <td class="syntax-code"><strong>Pattern range</strong></td>
            <td class="syntax-description">The pattern uses {n,m} syntax where n is minimum and m is maximum. For example, {2,4} matches 2, 3, or 4 digits. Set both to the same value for exact length matching.</td>
          </tr>
          <tr>
            <td class="syntax-code"><strong>Case sensitive</strong></td>
            <td class="syntax-description">When checked: matches exact capitalization. When unchecked: adds (?i) flag to ignore case. Note: This option mainly affects patterns that include letters, but can be useful for mixed alphanumeric patterns.</td>
          </tr>
          <tr>
            <td class="syntax-code"><strong>Use case</strong></td>
            <td class="syntax-description">Perfect for finding phone numbers, dates, reference numbers, or any numeric sequences of specific lengths. Great for formatting numbers consistently.</td>
          </tr>
        `;
                break;
            case 'punctuation':
                instructionsTable += `
          <tr>
            <td class="syntax-code"><strong>Punctuation type</strong></td>
            <td class="syntax-description">Select which punctuation marks to match from the dropdown menu. Options include: all punctuation (matches everything), specific marks like periods, commas, quotes, dashes, parentheses, brackets, braces, and more.</td>
          </tr>
          <tr>
            <td class="syntax-code"><strong>All punctuation</strong></td>
            <td class="syntax-description">Matches any punctuation mark: periods, commas, semicolons, colons, question marks, exclamation marks, quotes, apostrophes, hyphens, dashes, and brackets.</td>
          </tr>
          <tr>
            <td class="syntax-code"><strong>Specific marks</strong></td>
            <td class="syntax-description">Choose individual punctuation types to target specific marks. Useful when you want to format only certain punctuation differently, like making periods larger or changing quote styles.</td>
          </tr>
          <tr>
            <td class="syntax-code"><strong>Case sensitive</strong></td>
            <td class="syntax-description">When checked: matches exact capitalization. When unchecked: adds (?i) flag to ignore case. Note: This option mainly affects patterns that include letters alongside punctuation.</td>
          </tr>
          <tr>
            <td class="syntax-code"><strong>Use case</strong></td>
            <td class="syntax-description">Ideal for applying consistent formatting to punctuation marks, replacing punctuation styles, or finding specific punctuation patterns throughout your document.</td>
          </tr>
        `;
                break;
            case 'enclosed':
                instructionsTable += `
          <tr>
            <td class="syntax-code"><strong>Start marker</strong></td>
            <td class="syntax-description">Enter the character(s) that mark the beginning of the content you want to match. Can be a single character like "(" or "[", or multiple characters like "{{" or "<!--". Special characters are automatically escaped.</td>
          </tr>
          <tr>
            <td class="syntax-code"><strong>End marker</strong></td>
            <td class="syntax-description">Enter the character(s) that mark the end of the content. Must match the start marker type. Example: if start is "(", end should be ")". The pattern matches everything between these markers.</td>
          </tr>
          <tr>
            <td class="syntax-code"><strong>Pattern behavior</strong></td>
            <td class="syntax-description">The pattern uses [^end] to match any character except the end marker, ensuring it stops at the correct closing marker. Works with nested markers too, matching content up to the first closing marker.</td>
          </tr>
          <tr>
            <td class="syntax-code"><strong>Case sensitive</strong></td>
            <td class="syntax-description">When checked: matches exact capitalization within the enclosed content. When unchecked: adds (?i) flag to ignore case, so content matching is case-insensitive.</td>
          </tr>
          <tr>
            <td class="syntax-code"><strong>Use case</strong></td>
            <td class="syntax-description">Perfect for finding and formatting content within parentheses, brackets, quotes, or any custom delimiters. Great for styling citations, notes, or any bracketed content.</td>
          </tr>
        `;
                break;
        }
        // Add Whole word option instruction only for words search type
        if (searchType === 'words') {
            instructionsTable += `
        <tr>
          <td class="syntax-code"><strong>Whole word only</strong></td>
          <td class="syntax-description">When checked: matches complete words only using word boundaries (\\b). For example, "cat" won't match "category" or "scatter". When unchecked: matches the word anywhere it appears, even as part of other words.</td>
        </tr>
      `;
        }
        instructionsTable += '</table>';
        output.innerHTML = instructionsTable;
        // Hide syntax explanation when no pattern
        if (syntaxExplanation) {
            syntaxExplanation.style.display = 'none';
        }
    }
}
/**
 * Escapes HTML for safe display
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
/**
 * Shows/hides sections based on selected search type
 */
function updateSectionVisibility() {
    const searchType = document.querySelector('input[name="searchType"]:checked')?.value || 'words';
    const sections = {
        words: document.getElementById('wordsSection'),
        digits: document.getElementById('digitsSection'),
        punctuation: document.getElementById('punctuationSection'),
        enclosed: document.getElementById('enclosedSection')
    };
    Object.keys(sections).forEach(key => {
        const section = sections[key];
        if (section) {
            section.style.display = key === searchType ? 'block' : 'none';
        }
    });
}
/**
 * Shows the grep info modal
 */
function showGrepModal() {
    const modal = document.getElementById('grepModal');
    if (modal) {
        modal.classList.add('show');
    }
}
/**
 * Hides the grep info modal
 */
function hideGrepModal() {
    const modal = document.getElementById('grepModal');
    if (modal) {
        modal.classList.remove('show');
    }
}
/**
 * Initializes the grep generator
 */
export function initializeGrep() {
    // Initialize footer menu toggle
    const footerMenuToggle = document.getElementById('footerMenuToggle');
    const footer = document.getElementById('footer');
    if (footerMenuToggle && footer) {
        footerMenuToggle.addEventListener('click', () => {
            footer.classList.toggle('expanded');
        });
    }
    // Check if modal has been shown before
    const hasSeenModal = localStorage.getItem('grepModalShown');
    // Show modal on first visit
    if (!hasSeenModal) {
        setTimeout(() => {
            showGrepModal();
            localStorage.setItem('grepModalShown', 'true');
        }, 100);
    }
    // Event listener for "About GREP" link
    const grepInfoLink = document.getElementById('grepInfoLink');
    if (grepInfoLink) {
        grepInfoLink.addEventListener('click', (e) => {
            e.preventDefault();
            showGrepModal();
        });
    }
    // Modal close button
    const modalClose = document.getElementById('grepModalClose');
    if (modalClose) {
        modalClose.addEventListener('click', hideGrepModal);
    }
    // Close modal when clicking outside
    const modal = document.getElementById('grepModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideGrepModal();
            }
        });
    }
    // Show/hide sections based on search type
    const searchTypeInputs = document.querySelectorAll('input[name="searchType"]');
    searchTypeInputs.forEach(input => {
        input.addEventListener('change', () => {
            updateSectionVisibility();
            updateGrepPattern();
        });
    });
    // Update pattern on any input change
    const form = document.getElementById('grepForm');
    if (form) {
        form.addEventListener('input', updateGrepPattern);
        form.addEventListener('change', updateGrepPattern);
    }
    // Initial update
    updateSectionVisibility();
    updateGrepPattern();
}
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGrep);
}
else {
    initializeGrep();
}
