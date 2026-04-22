const fs = require('fs');

const path = 'src/app/carbon-market/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Replace typing
code = code.replace(/interface CarbonProduct \{[\s\S]*?is_active: boolean;\n\}/g, `interface CarbonProductStandard {
  id: string;
  series: string;
  name: string;
  vintage: string;
  price: string | number;
  is_active: boolean;
}`);

// Replace state
code = code.replace(/const \[products, setProducts\] = useState<CarbonProduct\[\]>\(\[\]\);/g, `const [standards, setStandards] = useState<CarbonProductStandard[]>([]);`);
code = code.replace(/const \[productsLoading, setProductsLoading\] = useState\(true\);/g, `const [loading, setLoading] = useState(true);`);

// Replace api call
code = code.replace(/fetch\('\/api\/carbon-products'\)/g, `fetch('/api/carbon-product-standards')`);
code = code.replace(/setProducts\(data\)/g, `setStandards(data)`);
code = code.replace(/setProductsLoading\(false\)/g, `setLoading(false)`);
code = code.replace(/fetchProducts/g, `fetchStandards`);

// Replace mapping block
code = code.replace(/productsLoading \?/g, `loading ?`);
code = code.replace(/Memuat produk/g, `Memuat standar...`);
code = code.replace(/products\.length === 0/g, `standards.length === 0`);
code = code.replace(/Belum ada produk/g, `Belum ada standar`);
code = code.replace(/Produk karbon belum tersedia saat ini/g, `Standar produk karbon belum tersedia saat ini`);

const productMapOld = `products.map((product) => {
                const priceNum = typeof product.price === 'string' ? parseInt(product.price) : product.price;
                const totalPrice = Math.ceil(totalEmission / 1000) * priceNum;

                return (
                  <Link key={product.id} href={\`/checkout/\${product.product_code}\`}>
                    <div className="bg-white rounded-2xl border border-border overflow-hidden flex active:scale-[0.98] transition-transform mt-3">
                      {/* Thumbnail */}
                      <div className="w-[108px] flex-none self-stretch relative bg-primaryLight overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={getImageUrl(product.image_url)}
                            alt={product.name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-4xl">
                            🌱
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                        {/* Badge */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={\`px-2 py-0.5 rounded-full text-[10px] font-bold leading-tight \${product.color_class || 'bg-primaryLight text-primary'}\`}>
                            {product.product_code}
                          </span>
                          {product.category && (
                            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-textMuted leading-tight">
                              {product.category}
                            </span>
                          )}
                        </div>

                        {/* Name */}
                        <h4 className="text-sm font-semibold text-textDark leading-snug line-clamp-2 mb-1">
                          {product.name}
                        </h4>

                        {/* Project */}
                        <p className="text-xs text-textMuted line-clamp-1 mb-2">
                          🏭 {product.project}
                        </p>

                        {/* Price row */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-textMuted">Per tCO2e</p>
                            <p className="text-sm font-bold text-primary">{formatCurrency(priceNum)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-textMuted">Total ≈{totalTon} t</p>
                            <p className="text-sm font-bold text-textDark">{formatCurrency(totalPrice)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })`;

const newMapStr = `standards.map((standard) => {
                const priceNum = typeof standard.price === 'string' ? parseFloat(standard.price) : standard.price;
                const totalPrice = Math.ceil(totalEmission / 1000) * priceNum;

                return (
                  <Link key={standard.id} href={\`/checkout/\${standard.series}\`}>
                    <div className="bg-white rounded-2xl border border-border p-4 flex flex-col active:scale-[0.98] transition-transform mt-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="px-2.5 py-1 rounded-full bg-primaryLight text-primary text-[10px] font-bold">
                          {standard.series}
                        </span>
                        <span className="text-[10px] text-textMuted px-2 py-1 bg-gray-50 rounded-full border border-gray-100">
                          Vintage: {standard.vintage}
                        </span>
                      </div>
                      
                      <h4 className="text-sm font-semibold text-textDark mb-3">
                        {standard.name}
                      </h4>

                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <div>
                          <p className="text-[10px] text-textMuted mb-0.5">Harga per tCO2e</p>
                          <p className="text-sm font-bold text-primary">{formatCurrency(priceNum)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-textMuted mb-0.5">Estimasi {totalTon} t</p>
                          <p className="text-sm font-bold text-textDark">{formatCurrency(totalPrice)}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })`;

code = code.replace(productMapOld, newMapStr);
// Remove getImageUrl import since we don't need it
code = code.replace(/import { getImageUrl } from '@\/lib\/image-utils';\n/g, '');

fs.writeFileSync(path, code);
