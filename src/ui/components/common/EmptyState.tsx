// src/ui/components/common/EmptyState.tsx
export function EmptyState({ text }: { text: string }) {
    return (
        <div className="flex items-center justify-center h-full text-gray-500">
            {text}
        </div>
    )
}
