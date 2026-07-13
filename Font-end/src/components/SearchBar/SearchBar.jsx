import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import './SearchBar.scss';

const SearchBar = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const requestRef = useRef(0);

    // Autocomplete : recherche dynamique via l'API produits
    useEffect(() => {
        if (!searchQuery.trim()) return;

        const handler = setTimeout(async () => {
            const requestId = ++requestRef.current;
            try {
                const res = await apiClient.get('/produits', {
                    params: { search: searchQuery.trim(), limit: 6, sort: 'name_asc' },
                });
                if (requestId !== requestRef.current) return;
                const products = Array.isArray(res.data) ? res.data : res.data?.data || [];
                const matches = products.map((product) => ({ id: product.id, label: product.nomProduit }));
                setResults(matches);
                setIsOpen(matches.length > 0);
            } catch {
                if (requestId === requestRef.current) setResults([]);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    const handleQueryChange = (value) => {
        setSearchQuery(value);
        if (!value.trim()) {
            requestRef.current += 1;
            setResults([]);
            setIsOpen(false);
        }
    };

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (searchQuery.trim()) {
            setIsOpen(false);
            navigate(`/catalogue?search=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const handleSelectResult = (result) => {
        setSearchQuery(result.label);
        setIsOpen(false);
        navigate(`/catalogue?search=${encodeURIComponent(result.label)}`);
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
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onFocus={() => searchQuery.trim() && results.length > 0 && setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                />
            </div>

            {isOpen && results.length > 0 && (
                <ul className="search-bar__dropdown">
                    {results.map((result) => (
                        <li key={result.id} className="search-bar__item">
                            <button
                                type="button"
                                className="search-bar__item-btn"
                                onMouseDown={() => handleSelectResult(result)}
                            >
                                {result.label}
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
