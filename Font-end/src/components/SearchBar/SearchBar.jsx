import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import './SearchBar.scss';

const MOCK_DATA = [
    '10N60 GM',
    '100N03',
    'Multimètre Digital',
    'Condensateur 100uF',
    'Résistance 1k Ohm',
    'Transistor NPN',
    'LED Rouge 5mm'
];

const SearchBar = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        const handler = setTimeout(() => {
            const filtered = MOCK_DATA.filter((item) =>
                item.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setResults(filtered);
            setIsOpen(true);
        }, 300);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    return (
        <div className="search-bar">
            <div className="search-bar__input-wrapper">
                <Search className="search-bar__icon" size={18} />
                <input
                    type="text"
                    className="search-bar__input"
                    placeholder="Rechercher un composant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.trim() && setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                />
            </div>

            {isOpen && results.length > 0 && (
                <ul className="search-bar__dropdown">
                    {results.map((result, index) => (
                        <li key={index} className="search-bar__item">
                            <button
                                className="search-bar__item-btn"
                                onClick={() => {
                                    setSearchQuery(result);
                                    setIsOpen(false);
                                }}
                            >
                                {result}
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {isOpen && searchQuery.trim() && results.length === 0 && (
                <div className="search-bar__dropdown">
                    <div className="search-bar__no-results">Aucun résultat trouvé</div>
                </div>
            )}
        </div>
    );
};

export default SearchBar;
