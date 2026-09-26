#include <vulkan/vulkan.h>
#include <cstdint>
#include <cstring>
#include <fstream>
#include <iostream>
#include <vector>

static void ok(VkResult r, const char* s) {
    if (r != VK_SUCCESS) {
        std::cerr << "FAIL " << s << " VkResult=" << r << "\n";
        std::exit(1);
    }
}

int main() {
    constexpr uint32_t N = 1024;
    constexpr VkDeviceSize SIZE = N * sizeof(uint32_t);

    VkApplicationInfo app{
        VK_STRUCTURE_TYPE_APPLICATION_INFO, nullptr,
        "VUC GPU Evidence", 1, "VUC", 1, VK_API_VERSION_1_1
    };

    VkInstanceCreateInfo ici{
        VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO, nullptr, 0,
        &app, 0, nullptr, 0, nullptr
    };

    VkInstance instance;
    ok(vkCreateInstance(&ici, nullptr, &instance), "vkCreateInstance");

    uint32_t count = 0;
    ok(vkEnumeratePhysicalDevices(instance, &count, nullptr),
       "enumerate");

    std::vector<VkPhysicalDevice> devs(count);
    ok(vkEnumeratePhysicalDevices(instance, &count, devs.data()),
       "enumerate devices");

    VkPhysicalDevice gpu = devs[0];

    VkPhysicalDeviceProperties props{};
    vkGetPhysicalDeviceProperties(gpu, &props);

    std::cout << "GPU_EXECUTION_TEST\n";
    std::cout << "device=" << props.deviceName << "\n";
    std::cout << "driver=" << props.driverVersion << "\n";

    uint32_t qcount = 0;
    vkGetPhysicalDeviceQueueFamilyProperties(gpu, &qcount, nullptr);

    std::vector<VkQueueFamilyProperties> qprops(qcount);
    vkGetPhysicalDeviceQueueFamilyProperties(
        gpu, &qcount, qprops.data());

    uint32_t qfamily = UINT32_MAX;
    for (uint32_t i = 0; i < qcount; ++i) {
        if (qprops[i].queueFlags & VK_QUEUE_COMPUTE_BIT) {
            qfamily = i;
            break;
        }
    }

    if (qfamily == UINT32_MAX) {
        std::cerr << "FAIL no compute queue\n";
        return 1;
    }

    float priority = 1.0f;

    VkDeviceQueueCreateInfo qci{
        VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO, nullptr, 0,
        qfamily, 1, &priority
    };

    VkDeviceCreateInfo dci{};
    dci.sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO;
    dci.queueCreateInfoCount = 1;
    dci.pQueueCreateInfos = &qci;

    VkDevice device;
    ok(vkCreateDevice(gpu, &dci, nullptr, &device),
       "vkCreateDevice");

    VkQueue queue;
    vkGetDeviceQueue(device, qfamily, 0, &queue);

    VkBufferCreateInfo bci{
        VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO, nullptr, 0,
        SIZE, VK_BUFFER_USAGE_STORAGE_BUFFER_BIT,
        VK_SHARING_MODE_EXCLUSIVE, 0, nullptr
    };

    VkBuffer buffer;
    ok(vkCreateBuffer(device, &bci, nullptr, &buffer),
       "vkCreateBuffer");

    VkMemoryRequirements req{};
    vkGetBufferMemoryRequirements(device, buffer, &req);

    VkPhysicalDeviceMemoryProperties mp{};
    vkGetPhysicalDeviceMemoryProperties(gpu, &mp);

    uint32_t mt = UINT32_MAX;

    for (uint32_t i = 0; i < mp.memoryTypeCount; ++i) {
        auto flags = mp.memoryTypes[i].propertyFlags;
        if ((req.memoryTypeBits & (1u << i)) &&
            (flags & VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT) &&
            (flags & VK_MEMORY_PROPERTY_HOST_COHERENT_BIT)) {
            mt = i;
            break;
        }
    }

    if (mt == UINT32_MAX) {
        std::cerr << "FAIL no HOST_VISIBLE|HOST_COHERENT memory\n";
        return 1;
    }

    VkMemoryAllocateInfo mai{
        VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO, nullptr,
        req.size, mt
    };

    VkDeviceMemory memory;
    ok(vkAllocateMemory(device, &mai, nullptr, &memory),
       "vkAllocateMemory");

    ok(vkBindBufferMemory(device, buffer, memory, 0),
       "vkBindBufferMemory");

    uint32_t* data = nullptr;
    ok(vkMapMemory(device, memory, 0, SIZE, 0,
                   reinterpret_cast<void**>(&data)),
       "vkMapMemory");

    for (uint32_t i = 0; i < N; ++i)
        data[i] = i;

    vkUnmapMemory(device, memory);

    // Descriptor
    VkDescriptorSetLayoutBinding db{
        0, VK_DESCRIPTOR_TYPE_STORAGE_BUFFER, 1,
        VK_SHADER_STAGE_COMPUTE_BIT, nullptr
    };

    VkDescriptorSetLayoutCreateInfo dlci{
        VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO,
        nullptr, 0, 1, &db
    };

    VkDescriptorSetLayout dsl;
    ok(vkCreateDescriptorSetLayout(
        device, &dlci, nullptr, &dsl), "descriptor layout");

    VkPipelineLayoutCreateInfo plci{
        VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO,
        nullptr, 0, 1, &dsl, 0, nullptr
    };

    VkPipelineLayout layout;
    ok(vkCreatePipelineLayout(
        device, &plci, nullptr, &layout), "pipeline layout");

    // SPIR-V
    std::ifstream f(
        "artifacts/gpu/vuc_compute.spv",
        std::ios::binary | std::ios::ate);

    if (!f) {
        std::cerr << "FAIL shader not found\n";
        return 1;
    }

    std::streamsize bytes = f.tellg();
    f.seekg(0);

    std::vector<uint32_t> spirv(bytes / sizeof(uint32_t));
    f.read(reinterpret_cast<char*>(spirv.data()), bytes);

    VkShaderModuleCreateInfo smci{
        VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO,
        nullptr, 0,
        spirv.size() * sizeof(uint32_t),
        spirv.data()
    };

    VkShaderModule shader;
    ok(vkCreateShaderModule(
        device, &smci, nullptr, &shader), "shader module");

    VkPipelineShaderStageCreateInfo stage{
        VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO,
        nullptr, 0,
        VK_SHADER_STAGE_COMPUTE_BIT,
        shader, "main", nullptr
    };

    VkComputePipelineCreateInfo pci{
        VK_STRUCTURE_TYPE_COMPUTE_PIPELINE_CREATE_INFO,
        nullptr, 0, stage, layout, VK_NULL_HANDLE, -1
    };

    VkPipeline pipeline;
    ok(vkCreateComputePipelines(
        device, VK_NULL_HANDLE, 1, &pci, nullptr, &pipeline),
        "compute pipeline");

    // Descriptor pool/set
    VkDescriptorPoolSize ps{
        VK_DESCRIPTOR_TYPE_STORAGE_BUFFER, 1
    };

    VkDescriptorPoolCreateInfo dpci{
        VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO,
        nullptr, 0, 1, 1, &ps
    };

    VkDescriptorPool pool;
    ok(vkCreateDescriptorPool(
        device, &dpci, nullptr, &pool), "descriptor pool");

    VkDescriptorSetAllocateInfo dsai{
        VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO,
        nullptr, pool, 1, &dsl
    };

    VkDescriptorSet ds;
    ok(vkAllocateDescriptorSets(
        device, &dsai, &ds), "descriptor set");

    VkDescriptorBufferInfo bi{buffer, 0, SIZE};

    VkWriteDescriptorSet write{
        VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET,
        nullptr, ds, 0, 0, 1,
        VK_DESCRIPTOR_TYPE_STORAGE_BUFFER,
        nullptr, &bi, nullptr
    };

    vkUpdateDescriptorSets(device, 1, &write, 0, nullptr);

    // Command buffer
    VkCommandPoolCreateInfo cpi{
        VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO,
        nullptr, VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT,
        qfamily
    };

    VkCommandPool cp;
    ok(vkCreateCommandPool(
        device, &cpi, nullptr, &cp), "command pool");

    VkCommandBufferAllocateInfo cai{
        VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO,
        nullptr, cp, VK_COMMAND_BUFFER_LEVEL_PRIMARY, 1
    };

    VkCommandBuffer cmd;
    ok(vkAllocateCommandBuffers(
        device, &cai, &cmd), "command buffer");

    VkCommandBufferBeginInfo begin{
        VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO,
        nullptr, VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT, nullptr
    };

    ok(vkBeginCommandBuffer(cmd, &begin), "begin command");

    vkCmdBindPipeline(
        cmd, VK_PIPELINE_BIND_POINT_COMPUTE, pipeline);

    vkCmdBindDescriptorSets(
        cmd, VK_PIPELINE_BIND_POINT_COMPUTE,
        layout, 0, 1, &ds, 0, nullptr);

    // 1024 elements / 64 invocations = 16 workgroups.
    vkCmdDispatch(cmd, 16, 1, 1);

    ok(vkEndCommandBuffer(cmd), "end command");

    VkFenceCreateInfo fi{
        VK_STRUCTURE_TYPE_FENCE_CREATE_INFO, nullptr, 0
    };

    VkFence fence;
    ok(vkCreateFence(
        device, &fi, nullptr, &fence), "fence");

    VkSubmitInfo submit{
        VK_STRUCTURE_TYPE_SUBMIT_INFO,
        nullptr, 0, nullptr, nullptr,
        1, &cmd, 0, nullptr
    };

    ok(vkQueueSubmit(queue, 1, &submit, fence),
       "vkQueueSubmit");

    ok(vkWaitForFences(
        device, 1, &fence, VK_TRUE, UINT64_MAX),
        "vkWaitForFences");

    ok(vkMapMemory(device, memory, 0, SIZE, 0,
                   reinterpret_cast<void**>(&data)),
       "map readback");

    bool valid = true;

    for (uint32_t i = 0; i < N; ++i) {
        uint32_t expected = i * 2u + 1u;

        if (data[i] != expected) {
            valid = false;
            std::cout << "bad_index=" << i
                      << " actual=" << data[i]
                      << " expected=" << expected << "\n";
            break;
        }
    }

    vkUnmapMemory(device, memory);

    std::cout << "dispatch_workgroups=16\n";
    std::cout << "elements=1024\n";
    std::cout << "gpu_execution="
              << (valid ? "EXECUTED" : "FAILED") << "\n";
    std::cout << "result_verified="
              << (valid ? "true" : "false") << "\n";

    vkDestroyFence(device, fence, nullptr);
    vkDestroyCommandPool(device, cp, nullptr);
    vkDestroyDescriptorPool(device, pool, nullptr);
    vkDestroyPipeline(device, pipeline, nullptr);
    vkDestroyShaderModule(device, shader, nullptr);
    vkDestroyPipelineLayout(device, layout, nullptr);
    vkDestroyDescriptorSetLayout(device, dsl, nullptr);
    vkFreeMemory(device, memory, nullptr);
    vkDestroyBuffer(device, buffer, nullptr);
    vkDestroyDevice(device, nullptr);
    vkDestroyInstance(instance, nullptr);

    return valid ? 0 : 1;
}
