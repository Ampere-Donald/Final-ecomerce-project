import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import axios from 'axios';
import './SearchBar.scss';

const SearchBar = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    // Autocomplete : recherche dynamique via l'API produits
    useEffect(() => {
        if (!searchQuery.trim()) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        const handler = setTimeout(async () => {
            try {
                const res = await axios.get('/api/produits');
                const filtered = res.data
                    .filter((p) =>
                        p.nomProduit.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (p.marque && p.marque.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .slice(0, 6)
                    .map((p) => p.nomProduit);
                setResults(filtered);
                setIsOpen(filtered.length > 0);
            } catch {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (searchQuery.trim()) {
            setIsOpen(false);
            navigate(`/catalogue?search=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const handleSelectResult = (result) => {
        setSearchQuery(result);
        setIsOpen(false);
        navigate(`/catalogue?search=${encodeURIComponent(result)}`);
    };

    return (
        <form className="search-bar" onSubmit={handleSubmit}>
            <div className="search-bar__input-wrapper">
                <Search className="search-bar__icon" size={18} />
                <input
                    type="text"
                    className="search-bar__input"
                    placeholder="Rechercher un composant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.trim() && results.length > 0 && setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                />
            </div>

            {isOpen && results.length > 0 && (
                <ul className="search-bar__dropdown">
                    {results.map((result, index) => (
                        <li key={index} className="search-bar__item">
                            <button
                                type="button"
                                className="search-bar__item-btn"
                                onMouseDown={() => handleSelectResult(result)}
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
        </form>
    );
};

export default SearchBar;
