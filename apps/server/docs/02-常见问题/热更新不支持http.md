先安装 expo-build-properties

```
bun add expo-build-properties
```

在 app.json 中添加配置：

```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "usesCleartextTraffic": true
          },
          "ios": {}
        }
      ]
    ]
  }
}
```
