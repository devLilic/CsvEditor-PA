type PreviewSourceData = {
    title?: string
    name?: string
    occupation?: string
    location?: string
    image?: string
}

export function createPreviewData(
    entityType: string,
    data: PreviewSourceData
): Record<string, string> {
    if (entityType === 'titles') {
        return { title: data.title ?? '' }
    }

    if (entityType === 'persons') {
        return {
            name: data.name ?? '',
            occupation: data.occupation ?? '',
        }
    }

    if (entityType === 'phoneCalls') {
        return {
            name: data.name ?? '',
            occupation: data.occupation ?? '',
            image: data.image ?? '',
        }
    }

    if (entityType === 'locations') {
        return { location: data.location ?? '' }
    }

    return {}
}
