import React from 'react';
import './Pagination.css';

const Pagination = ({ 
  currentPage, 
  totalItems, 
  itemsPerPage, 
  onPageChange, 
  onItemsPerPageChange 
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };
  
  const pageNumbers = getPageNumbers();
  
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  return (
    <div className="pagination-container">
      <div className="pagination-info">
        {startItem}-{endItem} of {totalItems} items
      </div>
      
      <div className="pagination-controls">
        <button
          className="pagination-btn pagination-first"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="First page"
        >
          «
        </button>
        
        <button
          className="pagination-btn pagination-prev"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Previous page"
        >
          ‹
        </button>
        
        {pageNumbers.map(page => (
          <button
            key={page}
            className={`pagination-btn pagination-number ${currentPage === page ? 'active' : ''}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
        
        <button
          className="pagination-btn pagination-next"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Next page"
        >
          ›
        </button>
        
        <button
          className="pagination-btn pagination-last"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="Last page"
        >
          »
        </button>
      </div>
      
      <div className="pagination-size">
        <select 
          value={itemsPerPage} 
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="pagination-select"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span className="pagination-size-label">per page</span>
      </div>
    </div>
  );
};

export default Pagination;
