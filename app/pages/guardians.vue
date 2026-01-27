<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const { data, status } = await useAsyncData('guardians',
  () => $fetch<Guardian[]>('https://noteworthy-z9k0.onrender.com/api/admin/guardian', {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      // This will log the raw response body.
      // Check your browser's developer console to see the structure of the data.
      console.log('API Response:', response._data)
    }
  }),
  {
    transform: (response: any) => {
      // The API might return data inside a property, e.g., { "data": [...] }
      // This line tries to find the array, assuming it might be nested.
      const guardianData = response?.data || response?.guardians || response
      const rows = Array.isArray(guardianData) ? guardianData : []
      return rows.map((guardian: any) => ({
        _id: guardian._id,
        email: guardian.email,
        name: guardian.firstName + ' ' + guardian.lastName,
        gender: guardian.gender,
        profileImageURL: guardian.profileImageURL,
      }))
    },
    lazy: false,
  }
)


type Guardian = {
  _id: string
  email: string
  name: string
  gender: string
  profileImageURL: string
}

const UAvatar = resolveComponent('UAvatar')
const NuxtLink = resolveComponent('NuxtLink')

const columns: TableColumn<Guardian>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-3' }, [
      h(UAvatar, { src: row.original.profileImageURL, alt: row.original.name }),
      h('div', undefined, [
        h(NuxtLink, { to: `/profile-guardian?id=${row.original._id}`, class: 'font-medium hover:underline' }, { default: () => row.original.name }),
        h('p', { class: 'text-sm text-gray-500 dark:text-gray-400' }, row.original.email)
      ])
    ])
  },
  {
    accessorKey: '_id',
    header: 'Guardian #',
    cell: ({ row }) => `#${row.getValue('_id')}`
  },
  {
    accessorKey: 'gender',
    header: 'Gender'
  },
]

// TABLE FILTER SCRIPT

const table = useTemplateRef('table')

const columnFilters = ref([
  {
    id: 'name',
    value: ''
  }
])

// END TABLE FILTER SCRIPT

// FORM SCRIPT 



// END FORM SCRIPT
</script>

<template>
  <UContainer>
    <UPageCard>

      <div class="flex items-center gap-4 mb-4">
        <div class="text-lg font-bold">guardians</div>
        <div style="margin-left: auto">
          <UInput :model-value="table?.tableApi?.getColumn('name')?.getFilterValue() as string" class="max-w-sm mr-5"
            placeholder="Search guardians..."
            @update:model-value="table?.tableApi?.getColumn('name')?.setFilterValue($event)" />
        </div>
      </div>


      <!--
        The UTable with `sticky` and viewport-dependent height (`max-h-[70vh]`) can cause a hydration mismatch.
        The server doesn't have a viewport, so it renders the HTML differently than the client.
        Wrapping the component in <ClientOnly> ensures it only renders in the browser, avoiding the error.
      -->
      <ClientOnly>
        <UTable ref="table" v-model:column-filters="columnFilters" sticky :data="data || []" :columns="columns" :loading="status === 'pending'" class="flex-1 max-h-[70vh]" />
      </ClientOnly>
    </UPageCard>
  </UContainer>

</template>
