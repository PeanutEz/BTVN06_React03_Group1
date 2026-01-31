import { Link } from "react-router-dom";
import type { Category } from "../types/product.type";

interface CategoryCardProps {
    category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
    return (
        <Link
            to={`/products?category=${category.code}`}
            className="group relative overflow-hidden rounded-2xl aspect-[4/3] shadow-lg hover:shadow-xl transition-all duration-300"
        >
            {/* Background Image */}
            <img
                src={category.image}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            {/* Content */}
            <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                    {category.name}
                </h3>
                <p className="text-gray-200 text-sm line-clamp-2 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    {category.description}
                </p>

                {/* Arrow Icon */}
                <div className="mt-3 flex items-center gap-2 text-amber-400">
                    <span className="text-sm font-medium">Khám phá</span>
                    <svg
                        className="w-4 h-4 transform group-hover:translate-x-2 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </Link>
    );
}
