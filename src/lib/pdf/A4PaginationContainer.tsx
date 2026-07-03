import React, { useState, useEffect, useRef } from 'react';

interface BlockDefinition {
  id: string;
  render: () => React.ReactNode;
  forcePageBreak?: boolean;
  isSignature?: boolean;
}

interface A4PaginationContainerProps {
  blocks: BlockDefinition[];
  company: any;
  RenderHeader: React.FC;
  RenderFooter: React.FC<{ pageNumber: number; totalPages: number }>;
  RenderWatermark: React.FC;
}

export const A4PaginationContainer: React.FC<A4PaginationContainerProps> = ({
  blocks,
  company,
  RenderHeader,
  RenderFooter,
  RenderWatermark
}) => {
  const [paginatedPages, setPaginatedPages] = useState<BlockDefinition[][]>([]);
  const [isReady, setIsReady] = useState(false);
  const measureContainerRef = useRef<HTMLDivElement>(null);
  const headerMeasureRef = useRef<HTMLDivElement>(null);
  const footerMeasureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsReady(false);
    
    const measureAndPaginate = () => {
      if (!measureContainerRef.current) return;

      // 1. Measure header and footer
      const headerHeight = headerMeasureRef.current ? headerMeasureRef.current.offsetHeight : 65;
      const footerHeight = footerMeasureRef.current ? footerMeasureRef.current.offsetHeight : 55;

      // A4 in 96 DPI: 297mm height, 210mm width.
      // 1mm = 3.77953px
      const totalPageHeight = 297 * 3.77953; // ~1122.5px
      const topMargin = 18 * 3.77953; // ~68px
      const bottomMargin = 22 * 3.77953; // ~83.1px
      
      // Net usable content height per page
      const maxContentHeight = totalPageHeight - topMargin - bottomMargin - headerHeight - footerHeight - 15; // 15px safe buffer

      // 2. Measure each block
      const blockElements = measureContainerRef.current.querySelectorAll('[data-block-index]');
      const heights: number[] = [];
      blockElements.forEach((el: any) => {
        heights.push(el.offsetHeight || el.getBoundingClientRect().height);
      });

      // 3. Paginate
      const pagesList: BlockDefinition[][] = [];
      let currentPage: BlockDefinition[] = [];
      let currentHeight = 0;

      // Signature minimum space: 75mm -> 75 * 3.77953 = 283.4px
      const minSignatureSpace = 75 * 3.77953;

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const blockHeight = heights[i] || 100; // fallback if element not measured

        const forceBreak = block.forcePageBreak;
        const isSig = block.isSignature;
        
        // If it is signature block, verify we have at least 75mm (minSignatureSpace) available,
        // otherwise push to the next page.
        const requiredSpace = isSig ? Math.max(blockHeight, minSignatureSpace) : blockHeight;

        if (forceBreak || (currentHeight + requiredSpace > maxContentHeight && currentHeight > 0)) {
          // If a block by itself exceeds maxContentHeight, let it start a new page anyway
          if (currentPage.length > 0) {
            pagesList.push(currentPage);
          }
          currentPage = [block];
          currentHeight = blockHeight;
        } else {
          currentPage.push(block);
          currentHeight += blockHeight;
        }
      }

      if (currentPage.length > 0) {
        pagesList.push(currentPage);
      }

      setPaginatedPages(pagesList);
      setIsReady(true);
    };

    // Small delay to allow fonts and dynamic styling to settle before measuring
    const timer = setTimeout(() => {
      measureAndPaginate();
    }, 150);

    return () => clearTimeout(timer);
  }, [blocks, company]);

  return (
    <div className="pdf-pagination-wrapper w-full">
      {/* 1. Offscreen Measuring Container */}
      <div 
        ref={measureContainerRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '174mm', // Exact A4 width (210mm) minus margins (18mm left, 18mm right)
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
        className="font-sans text-slate-900"
      >
        {/* Render header & footer once to measure their height */}
        <div ref={headerMeasureRef} className="w-full">
          <RenderHeader />
        </div>
        <div ref={footerMeasureRef} className="w-full">
          <RenderFooter pageNumber={1} totalPages={1} />
        </div>

        {/* Render all blocks to measure their height */}
        {blocks.map((block, index) => (
          <div key={block.id} data-block-index={index} className="w-full block-to-measure mb-2">
            {block.render()}
          </div>
        ))}
      </div>

      {/* 2. Display Paginated Pages when ready */}
      {isReady ? (
        <div className="pdf-document-pages space-y-6">
          {paginatedPages.map((pageBlocks, pageIndex) => (
            <div 
              key={pageIndex}
              className="pdf-page bg-white relative flex flex-col justify-between shadow-lg mx-auto"
              style={{
                width: '210mm',
                height: '297mm', // strict A4 height
                padding: '18mm 18mm 22mm 18mm', // precise requested margins (Top, Right, Bottom, Left)
                boxSizing: 'border-box',
                position: 'relative',
                pageBreakAfter: 'always',
                breakAfter: 'page',
              }}
            >
              {/* Watermark background */}
              <RenderWatermark />

              {/* Page Content wrapper */}
              <div className="pdf-content-wrapper relative z-10 flex-grow flex flex-col">
                <RenderHeader />
                <div className="pdf-blocks-container flex-grow flex flex-col justify-start space-y-4">
                  {pageBlocks.map((block) => (
                    <div key={block.id} className="pdf-content-block">
                      {block.render()}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="relative z-10 mt-auto">
                <RenderFooter pageNumber={pageIndex + 1} totalPages={paginatedPages.length} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Render loading placeholder/skeleton to avoid layout shifting or flash */
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-slate-200 shadow-sm max-w-md mx-auto my-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-3"></div>
          <p className="text-sm font-medium text-slate-700">Calculando distribuição inteligente de páginas...</p>
          <p className="text-xs text-slate-400 mt-1">Ajustando quebras de cláusulas e assinaturas</p>
        </div>
      )}

      <style>{`
        .pdf-page {
          background-color: #ffffff !important;
          color: #0f172a !important;
          font-family: 'Inter', sans-serif !important;
        }
        .pdf-watermark-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 0;
          pointer-events: none;
          opacity: 0.03;
        }
        .pdf-watermark-overlay img {
          width: 45%;
          max-width: 250px;
          object-fit: contain;
        }
        @media print {
          .pdf-page {
            box-shadow: none !important;
            margin: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>
    </div>
  );
};
