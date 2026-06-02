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
    if (entityType === 'titles' || entityType === 'hotTitles' || entityType === 'waitTitles') {
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

    if (entityType === 'locations' || entityType === 'waitLocations') {
        return { location: data.location ?? '' }
    }

    return {}
}
