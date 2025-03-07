'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { courseBuilderAdapter } from '@/db'
import { inngest } from '@/inngest/inngest.server'
import { getServerAuthSession } from '@/server/auth'

import { VIDEO_RESOURCE_CREATED_EVENT } from '@coursebuilder/core/inngest/video-processing/events/event-video-resource'
import { ContentResource } from '@coursebuilder/core/schemas'

export async function reprocessTranscript({
	videoResourceId,
}: {
	videoResourceId?: string | null
}) {
	// template for the url to download the mp4 file from mux
	// https://stream.mux.com/{PLAYBACK_ID}/{MP4_FILE_NAME}?download={FILE_NAME}
	const { session, ability } = await getServerAuthSession()

	if (!session || !ability.can('create', 'Content')) {
		throw new Error('Unauthorized')
	}

	const videoResource =
		await courseBuilderAdapter.getVideoResource(videoResourceId)

	if (videoResource?.id) {
		await inngest.send({
			name: VIDEO_RESOURCE_CREATED_EVENT,
			data: {
				videoResourceId: videoResource.id,
				originalMediaUrl: `https://stream.mux.com/${videoResource.muxPlaybackId}/low.mp4?download=${videoResource.id}`,
			},
			user: session.user,
		})
	}
}

export const onPostSave = async (resource: ContentResource) => {
	const post = await courseBuilderAdapter.getContentResource(resource.id)
	revalidateTag('posts')
	revalidatePath(`/${post?.fields?.slug}`)
	redirect(`/${resource.fields?.slug}`)
}

export const onPostPublish = async (resource: ContentResource) => {
	redirect(`/${resource.fields?.slug}?published=true`)
}
