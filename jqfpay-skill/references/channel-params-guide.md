# 渠道基础参数引导

> **注意：渠道列表、下载链接以在线文档为准，本文档仅为格式说明和代码示例。**
>
> 在线文档：https://doc.jeequan.com/#/integrate/jqf/api/351
>
> 获取最新数据：
> ```bash
> curl -X POST "https://doc.jeequan.com/doc-wiki/open-api/integrate/page/detail" \
>   -d "pageId=351&space=jqf-api&integrate=jqf&version=&userUuid=&accessPassword=&_=https://doc.jeequan.com&-lang=zh-CN"
> ```

进件提交时需要传入地区编码、银行编码、行业类目 MCC 等参数。这些参数由商户的业务信息决定，开发者需要将原始数据文件导入系统供前端选择使用。

**对接进件时，先获取 pageId=351 的在线文档，确认当前渠道的参数文件下载链接和数据格式。**

---

## 字段格式要求

以下格式适用于所有渠道，具体编码值从对应渠道的数据文件中获取。

### areaCode（省市区编码）

- **类型**：字符串数组
- **格式**：三级编码数组 `["省级编码", "市级编码", "区级编码"]`
- **示例**：`["130000", "130900", "130902"]` 表示 河北省-沧州市-新华区
- **数据文件**：JSON 格式，树形结构（省 → 市 → 区），从在线文档中获取下载链接

### settAccountBankCode（银行编码）

- **类型**：字符串
- **格式**：各渠道编码不同，从对应的 banks 文件中获取
- **数据文件**：通常为 XLSX 格式，从在线文档中获取下载链接

### mccCode（行业类目MCC）

- **类型**：字符串
- **格式**：各渠道编码不同，从对应的 mcc 文件中获取
- **数据文件**：JSON 或 XLSX 格式，部分渠道按商户类型区分（如嘉联分小微/企业两套）

---

## 数据加载代码示例

将下载的参数文件导入到应用系统，供前端表单选择使用。

### Java：加载 JSON 省市区编码

```java
import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import java.nio.file.Files;
import java.nio.file.Paths;

// areaCode.json 为树形结构：省 → 市 → 区
public class AreaCodeLoader {

    private static JSONArray areaTree;

    public static void load(String filePath) throws Exception {
        byte[] bytes = Files.readAllBytes(Paths.get(filePath));
        areaTree = JSON.parseArray(new String(bytes, "UTF-8"));
    }

    /** 根据省市区名称查找编码数组 */
    public static String[] findCodes(String provinceName, String cityName, String districtName) {
        for (int i = 0; i < areaTree.size(); i++) {
            JSONObject province = areaTree.getJSONObject(i);
            if (province.getString("name").contains(provinceName)) {
                String provinceCode = province.getString("code");
                JSONArray cities = province.getJSONArray("children");
                for (int j = 0; j < cities.size(); j++) {
                    JSONObject city = cities.getJSONObject(j);
                    if (city.getString("name").contains(cityName)) {
                        String cityCode = city.getString("code");
                        JSONArray districts = city.getJSONArray("children");
                        for (int k = 0; k < districts.size(); k++) {
                            JSONObject district = districts.getJSONObject(k);
                            if (district.getString("name").contains(districtName)) {
                                return new String[]{provinceCode, cityCode, district.getString("code")};
                            }
                        }
                    }
                }
            }
        }
        return null;
    }
}
```

### Python：加载 JSON 省市区编码

```python
import json

def load_area_code(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

def find_codes(area_tree, province_name, city_name, district_name):
    for province in area_tree:
        if province_name in province["name"]:
            for city in province.get("children", []):
                if city_name in city["name"]:
                    for district in city.get("children", []):
                        if district_name in district["name"]:
                            return [province["code"], city["code"], district["code"]]
    return None
```

### PHP：加载 JSON 省市区编码

```php
function loadAreaCode(string $filePath): array {
    $json = file_get_contents($filePath);
    return json_decode($json, true);
}

function findCodes(array $areaTree, string $provinceName, string $cityName, string $districtName): ?array {
    foreach ($areaTree as $province) {
        if (strpos($province['name'], $provinceName) !== false) {
            foreach ($province['children'] ?? [] as $city) {
                if (strpos($city['name'], $cityName) !== false) {
                    foreach ($city['children'] ?? [] as $district) {
                        if (strpos($district['name'], $districtName) !== false) {
                            return [$province['code'], $city['code'], $district['code']];
                        }
                    }
                }
            }
        }
    }
    return null;
}
```

### XLSX 文件读取提示

银行编码和部分 MCC 文件为 XLSX 格式，建议：

- **Java**：使用 `Apache POI` 或 `Alibaba EasyExcel` 读取
- **Python**：使用 `openpyxl` 或 `pandas` 读取
- **PHP**：使用 `PhpSpreadsheet` 读取

读取后导入数据库或缓存，供前端下拉框使用。
